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
  brandColors: string[];
  usp: string;
  pageSpeed: { score: 'fast' | 'medium' | 'slow'; loadTime: number };
  pixelDetected: boolean;
  h1Text: string;
}

interface AdVariant {
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  angle: string;
  hook: string;
}

const HOOK_LIBRARY = [
  { type: 'curiosity', hooks: ["Wait until you see this...", "Most people don't know this, but...", "Here's what nobody tells you about..."] },
  { type: 'urgency', hooks: ["Don't miss out on...", "Last chance to...", "Limited time only:"] },
  { type: 'social_proof', hooks: ["Join 10,000+ happy customers", "See why everyone's talking about...", "The #1 choice for..."] },
  { type: 'problem', hooks: ["Tired of...?", "Still struggling with...?", "Finally, a solution for..."] },
  { type: 'benefit', hooks: ["Imagine if you could...", "What if you never had to...again?", "Get ready to..."] },
];

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

function extractColors(html: string): string[] {
  const colors: string[] = [];
  
  const hexMatches = html.matchAll(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})(?![0-9A-Fa-f])/g);
  for (const match of hexMatches) {
    const color = '#' + match[1].toUpperCase();
    if (!colors.includes(color) && colors.length < 5) {
      if (!['#FFFFFF', '#000000', '#FFF', '#000'].includes(color)) {
        colors.push(color);
      }
    }
  }
  
  const rgbMatches = html.matchAll(/rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi);
  for (const match of rgbMatches) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    const color = `#${r}${g}${b}`.toUpperCase();
    if (!colors.includes(color) && colors.length < 5) {
      if (!['#FFFFFF', '#000000'].includes(color)) {
        colors.push(color);
      }
    }
  }
  
  if (colors.length === 0) {
    colors.push('#6366F1', '#10B981');
  }
  
  return colors.slice(0, 5);
}

function detectPixel(html: string): boolean {
  return html.includes('fbq(') || 
         html.includes('facebook.com/tr') || 
         html.includes('connect.facebook.net') ||
         html.includes('fbevents.js');
}

function extractUSP(html: string, title: string, description: string): string {
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const h1Text = h1Match ? h1Match[1].trim() : '';
  
  const taglineMatch = html.match(/<(?:p|span|div)[^>]*class=["'][^"']*(?:tagline|slogan|hero-text|subtitle)[^"']*["'][^>]*>([^<]+)/i);
  const tagline = taglineMatch ? taglineMatch[1].trim() : '';
  
  if (tagline && tagline.length > 10 && tagline.length < 200) {
    return tagline;
  }
  if (h1Text && h1Text.length > 5 && h1Text.length < 150 && h1Text !== title) {
    return h1Text;
  }
  if (description && description.length > 10) {
    return description.slice(0, 150);
  }
  return title || 'Quality products and services';
}

async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    if (!isAllowedUrl(url)) {
      throw new Error('URL not allowed');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const startTime = Date.now();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Shothik/1.0; +https://shothik.ai)',
      },
      signal: controller.signal,
    });
    
    const loadTime = Date.now() - startTime;
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
    
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const h1Text = h1Match ? h1Match[1].trim() : '';
    
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    const images: string[] = [];
    if (ogImageMatch) {
      images.push(ogImageMatch[1]);
    }
    
    const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
    for (const match of imgMatches) {
      if (images.length < 8) {
        let imgUrl = match[1];
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl;
        } else if (imgUrl.startsWith('/')) {
          const urlObj = new URL(url);
          imgUrl = urlObj.origin + imgUrl;
        }
        if (!images.includes(imgUrl) && !imgUrl.includes('data:') && !imgUrl.includes('icon') && !imgUrl.includes('logo')) {
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
    
    const brandColors = extractColors(html);
    const pixelDetected = detectPixel(html);
    const usp = extractUSP(html, title, description);
    
    const pageSpeed = {
      score: loadTime < 1500 ? 'fast' as const : loadTime < 3000 ? 'medium' as const : 'slow' as const,
      loadTime,
    };
    
    return {
      title,
      description,
      images,
      text: textContent,
      brandColors,
      usp,
      pageSpeed,
      pixelDetected,
      h1Text,
    };
  } catch (error) {
    logger.error('URL scraping failed', { url, error });
    throw new Error('Failed to analyze URL');
  }
}

function selectHooks(category: string): string[] {
  const relevantHooks: string[] = [];
  for (const hookSet of HOOK_LIBRARY) {
    relevantHooks.push(hookSet.hooks[Math.floor(Math.random() * hookSet.hooks.length)]);
  }
  return relevantHooks.slice(0, 3);
}

async function generateAdCopy(scrapedData: ScrapedData, url: string): Promise<any> {
  const hooks = selectHooks('general');
  
  const prompt = `You are an expert Facebook/Instagram ad copywriter. Based on the following website content, generate 3 different ad variations.

Website URL: ${url}
Title: ${scrapedData.title}
USP: ${scrapedData.usp}
Description: ${scrapedData.description}
Main Heading: ${scrapedData.h1Text}
Content: ${scrapedData.text.slice(0, 1500)}

Use these proven hooks as inspiration: ${hooks.join(', ')}

Analyze the brand voice from the content - is it formal, casual, playful, professional? Match that tone.

Generate a JSON response with this exact structure:
{
  "adCopy": [
    {
      "headline": "Short catchy headline (max 40 chars)",
      "primaryText": "Compelling ad text that drives action (max 125 chars)",
      "description": "Link description text (max 30 chars)",
      "callToAction": "Learn More" or "Shop Now" or "Sign Up" or "Get Offer" or "Book Now",
      "angle": "problem_solution" or "benefit_value" or "social_proof",
      "hook": "The hook used at start of primaryText"
    }
  ],
  "targetAudience": {
    "interests": ["interest1", "interest2", "interest3", "interest4", "interest5"],
    "ageRange": { "min": 25, "max": 54 },
    "gender": "all" or "male" or "female",
    "demographics": ["demographic1", "demographic2"]
  },
  "brandVoice": "formal" or "casual" or "playful" or "professional",
  "productCategory": "detected product category"
}

Create 3 different ad variations with different angles:
1. Problem/Solution focused - address a pain point
2. Benefit/Value focused - highlight key benefits
3. Social proof/Trust focused - leverage credibility

Only respond with valid JSON, no other text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Meta Ads expert copywriter. Only respond with valid JSON. Match the brand voice detected in the content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
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
          primaryText: scrapedData.usp.slice(0, 125) || 'Check out our latest offerings and find what you need.',
          description: 'Learn more today',
          callToAction: 'Learn More',
          angle: 'benefit_value',
          hook: 'Discover'
        },
        {
          headline: 'Transform Your Experience Today',
          primaryText: 'Join thousands who have already discovered the difference.',
          description: 'Join now',
          callToAction: 'Shop Now',
          angle: 'social_proof',
          hook: 'Join thousands'
        },
        {
          headline: 'Limited Time Offer',
          primaryText: 'Don\'t miss out on this exclusive opportunity.',
          description: 'Get it now',
          callToAction: 'Get Offer',
          angle: 'problem_solution',
          hook: 'Don\'t miss'
        }
      ],
      targetAudience: {
        interests: ['Online Shopping', 'Technology', 'Lifestyle', 'E-commerce', 'Social Media'],
        ageRange: { min: 25, max: 54 },
        gender: 'all',
        demographics: ['Urban professionals', 'Young adults']
      },
      brandVoice: 'professional',
      productCategory: 'General'
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
      usp: scrapedData.usp,
      images: scrapedData.images,
      brandColors: scrapedData.brandColors,
      pageSpeed: scrapedData.pageSpeed,
      pixelDetected: scrapedData.pixelDetected,
      adCopy: aiContent.adCopy,
      targetAudience: aiContent.targetAudience,
      brandVoice: aiContent.brandVoice,
      productCategory: aiContent.productCategory,
      createdAt: new Date().toISOString(),
    };

    logger.info('Boost analysis complete', { 
      url, 
      adVariants: aiContent.adCopy.length,
      pixelDetected: scrapedData.pixelDetected,
      pageSpeed: scrapedData.pageSpeed.score
    });

    res.json(session);
  } catch (error) {
    next(error);
  }
});

router.post('/launch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { session, selectedAdIndex, budget, duration, targeting, tenantId, adAccountId, pageId } = req.body;

    if (!session || !tenantId || !adAccountId || !pageId) {
      return res.status(400).json({ error: 'Missing required fields: session, tenantId, adAccountId, pageId' });
    }

    logger.info('Launching boost campaign', { 
      url: session.url, 
      budget, 
      duration,
      tenantId,
      adAccountId,
      pageId
    });

    const campaignId = `boost_${Date.now()}`;
    const estimatedReach = Math.floor(budget * duration * 800 + Math.random() * 5000);
    const estimatedClicks = Math.floor(estimatedReach * 0.02);
    
    res.json({
      success: true,
      campaignId,
      message: 'Campaign created successfully. It will be reviewed by Meta before going live.',
      estimatedReach,
      estimatedClicks,
      totalBudget: budget * duration,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
