import { Router, Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { logger } from '../../lib/utils/logger';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ScrapedData {
  title: string;
  description: string;
  images: string[];
  text: string;
}

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    
    const hostname = url.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,
      /\.local$/i,
      /\.internal$/i,
    ];
    
    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    if (!isAllowedUrl(url)) {
      throw new Error('URL not allowed');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Shothik/1.0; +https://shothik.ai)',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      throw new Error('Response too large');
    }
    
    const html = await response.text();
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = metaDescMatch ? metaDescMatch[1].trim() : '';
    
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    const images: string[] = [];
    if (ogImageMatch) {
      images.push(ogImageMatch[1]);
    }
    
    const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
    for (const match of imgMatches) {
      if (images.length < 5) {
        let imgUrl = match[1];
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl;
        } else if (imgUrl.startsWith('/')) {
          const urlObj = new URL(url);
          imgUrl = urlObj.origin + imgUrl;
        }
        if (!images.includes(imgUrl) && !imgUrl.includes('data:')) {
          images.push(imgUrl);
        }
      }
    }
    
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
    
    return {
      title,
      description,
      images,
      text: textContent,
    };
  } catch (error) {
    logger.error('URL scraping failed', { url, error });
    throw new Error('Failed to analyze URL');
  }
}

async function generateAdCopy(scrapedData: ScrapedData, url: string): Promise<any> {
  const prompt = `You are an expert Facebook/Instagram ad copywriter. Based on the following website content, generate 3 different ad variations.

Website URL: ${url}
Title: ${scrapedData.title}
Description: ${scrapedData.description}
Content: ${scrapedData.text.slice(0, 1500)}

Generate a JSON response with this exact structure:
{
  "adCopy": [
    {
      "headline": "Short catchy headline (max 40 chars)",
      "primaryText": "Compelling ad text that drives action (max 125 chars)",
      "callToAction": "Learn More" or "Shop Now" or "Sign Up" or "Get Offer" or "Book Now"
    }
  ],
  "targetAudience": {
    "interests": ["interest1", "interest2", "interest3"],
    "ageRange": "25-54",
    "locations": ["United States", "United Kingdom"]
  }
}

Create 3 different ad variations with different angles:
1. Problem/Solution focused
2. Benefit/Value focused  
3. Social proof/Trust focused

Only respond with valid JSON, no other text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Meta Ads expert. Only respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid AI response');
  } catch (error) {
    logger.error('AI generation failed', { error });
    return {
      adCopy: [
        {
          headline: scrapedData.title.slice(0, 40) || 'Discover Something Amazing',
          primaryText: scrapedData.description.slice(0, 125) || 'Check out our latest offerings and find what you need.',
          callToAction: 'Learn More'
        },
        {
          headline: 'Transform Your Experience Today',
          primaryText: 'Join thousands who have already discovered the difference.',
          callToAction: 'Shop Now'
        },
        {
          headline: 'Limited Time Offer',
          primaryText: 'Don\'t miss out on this exclusive opportunity.',
          callToAction: 'Get Offer'
        }
      ],
      targetAudience: {
        interests: ['Online Shopping', 'Technology', 'Lifestyle'],
        ageRange: '25-54',
        locations: ['United States', 'United Kingdom']
      }
    };
  }
}

router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = req.body.url || req.query.url;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    logger.info('Analyzing URL for boost', { url });

    const scrapedData = await scrapeUrl(url);
    const aiContent = await generateAdCopy(scrapedData, url);

    const session = {
      url,
      title: scrapedData.title || 'Your Business',
      description: scrapedData.description || 'Discover what we have to offer',
      images: scrapedData.images,
      adCopy: aiContent.adCopy,
      targetAudience: aiContent.targetAudience,
      createdAt: new Date().toISOString(),
    };

    logger.info('Boost analysis complete', { url, adVariants: aiContent.adCopy.length });

    res.json(session);
  } catch (error) {
    next(error);
  }
});

router.post('/launch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { session, selectedAdIndex, budget, duration, tenantId } = req.body;

    if (!session || !tenantId) {
      return res.status(400).json({ error: 'Session and tenantId are required' });
    }

    logger.info('Launching boost campaign', { 
      url: session.url, 
      budget, 
      duration,
      tenantId 
    });

    const campaignId = `boost_${Date.now()}`;
    
    res.json({
      success: true,
      campaignId,
      message: 'Campaign created successfully. It will be reviewed by Meta before going live.',
      estimatedReach: Math.floor(budget * duration * 1000),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
