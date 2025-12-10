import { Router, Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { logger } from '../../lib/utils/logger';
import { BoostDraftModel } from '../../lib/db/models/BoostDraft';
import { createBoostCampaign, getReachEstimate } from '../../lib/services/meta-campaigns/campaign-creator';
import { getAccessToken } from '../../lib/services/meta-oauth/oauth-service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

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
  { type: 'curiosity', hooks: [
    "Wait until you see this...",
    "Most people don't know this, but...",
    "Here's what nobody tells you about...",
    "I never expected this to work, but...",
    "The secret that changed everything...",
    "You won't believe what happened when...",
    "This one thing makes all the difference...",
    "What they don't want you to know...",
    "The truth about...",
    "I was skeptical too, until..."
  ]},
  { type: 'urgency', hooks: [
    "Don't miss out on...",
    "Last chance to...",
    "Limited time only:",
    "Ending soon:",
    "Only X left in stock...",
    "Sale ends midnight!",
    "Today only:",
    "Flash sale alert!",
    "While supplies last...",
    "Final hours to save..."
  ]},
  { type: 'social_proof', hooks: [
    "Join 10,000+ happy customers",
    "See why everyone's talking about...",
    "The #1 choice for...",
    "As featured in...",
    "Trusted by leading brands",
    "5-star rated by customers",
    "Award-winning quality",
    "Customer favorite:",
    "Best seller alert!",
    "Recommended by experts"
  ]},
  { type: 'problem', hooks: [
    "Tired of...?",
    "Still struggling with...?",
    "Finally, a solution for...",
    "Fed up with...?",
    "Stop wasting time on...",
    "The problem with... is...",
    "Frustrated by...?",
    "Why does... have to be so hard?",
    "There's a better way to...",
    "Say goodbye to..."
  ]},
  { type: 'benefit', hooks: [
    "Imagine if you could...",
    "What if you never had to...again?",
    "Get ready to...",
    "Transform your... in days",
    "Unlock the power of...",
    "Discover how to...",
    "The easiest way to...",
    "Finally achieve...",
    "Start your journey to...",
    "Experience the difference of..."
  ]},
  { type: 'question', hooks: [
    "Ready to transform your...?",
    "Want to know the secret to...?",
    "Looking for...?",
    "Need help with...?",
    "Struggling to find...?",
    "What if... was easier?",
    "Have you tried...?",
    "Did you know...?",
    "Why settle for less when...?",
    "What's stopping you from...?"
  ]},
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

const CATEGORY_INTEREST_MAP: Record<string, { interests: string[], demographics: string[], ageRange: { min: number, max: number }, gender: string }> = {
  'ecommerce': {
    interests: ['Online Shopping', 'E-commerce', 'Retail Therapy', 'Shopping Online', 'Deal Hunters'],
    demographics: ['Urban professionals', 'Young adults'],
    ageRange: { min: 25, max: 54 },
    gender: 'all'
  },
  'beauty': {
    interests: ['Beauty', 'Skincare', 'Cosmetics', 'Self-care', 'Wellness', 'Makeup'],
    demographics: ['Beauty enthusiasts', 'Health conscious'],
    ageRange: { min: 18, max: 45 },
    gender: 'female'
  },
  'fashion': {
    interests: ['Fashion', 'Clothing', 'Style', 'Apparel', 'Accessories', 'Trends'],
    demographics: ['Fashion forward', 'Trendsetters'],
    ageRange: { min: 18, max: 40 },
    gender: 'all'
  },
  'technology': {
    interests: ['Technology', 'Gadgets', 'Electronics', 'Software', 'Innovation', 'Tech News'],
    demographics: ['Early adopters', 'Tech professionals'],
    ageRange: { min: 22, max: 55 },
    gender: 'all'
  },
  'fitness': {
    interests: ['Fitness', 'Gym', 'Workout', 'Health', 'Nutrition', 'Sports'],
    demographics: ['Fitness enthusiasts', 'Active lifestyle'],
    ageRange: { min: 20, max: 50 },
    gender: 'all'
  },
  'food': {
    interests: ['Food', 'Cooking', 'Recipes', 'Restaurants', 'Gourmet', 'Healthy Eating'],
    demographics: ['Foodies', 'Home cooks'],
    ageRange: { min: 25, max: 55 },
    gender: 'all'
  },
  'education': {
    interests: ['Education', 'Online Courses', 'Learning', 'Skills Development', 'Career Growth'],
    demographics: ['Students', 'Professionals'],
    ageRange: { min: 18, max: 45 },
    gender: 'all'
  },
  'finance': {
    interests: ['Finance', 'Investing', 'Savings', 'Money Management', 'Cryptocurrency'],
    demographics: ['Investors', 'Professionals'],
    ageRange: { min: 28, max: 60 },
    gender: 'all'
  },
  'travel': {
    interests: ['Travel', 'Vacation', 'Adventure', 'Tourism', 'Hotels', 'Flights'],
    demographics: ['Travelers', 'Adventure seekers'],
    ageRange: { min: 25, max: 55 },
    gender: 'all'
  },
  'home': {
    interests: ['Home Decor', 'Interior Design', 'Furniture', 'DIY', 'Home Improvement'],
    demographics: ['Homeowners', 'Renters'],
    ageRange: { min: 28, max: 55 },
    gender: 'all'
  },
  'default': {
    interests: ['Online Shopping', 'Lifestyle', 'Social Media', 'Entertainment', 'News'],
    demographics: ['General audience'],
    ageRange: { min: 25, max: 54 },
    gender: 'all'
  }
};

function detectProductCategory(text: string, title: string): string {
  const content = `${text} ${title}`.toLowerCase();
  
  const categoryKeywords: Record<string, string[]> = {
    'beauty': ['beauty', 'skincare', 'cosmetic', 'makeup', 'serum', 'cream', 'facial', 'hair care'],
    'fashion': ['fashion', 'clothing', 'apparel', 'dress', 'shoes', 'accessories', 'jewelry', 'wear'],
    'technology': ['tech', 'software', 'app', 'digital', 'computer', 'phone', 'gadget', 'saas'],
    'fitness': ['fitness', 'gym', 'workout', 'exercise', 'training', 'yoga', 'sport', 'health'],
    'food': ['food', 'recipe', 'restaurant', 'cooking', 'meal', 'diet', 'nutrition', 'organic'],
    'education': ['course', 'learn', 'training', 'education', 'tutorial', 'class', 'skill', 'certification'],
    'finance': ['finance', 'invest', 'money', 'bank', 'crypto', 'trading', 'loan', 'insurance'],
    'travel': ['travel', 'vacation', 'hotel', 'flight', 'tour', 'booking', 'destination', 'trip'],
    'home': ['home', 'furniture', 'decor', 'interior', 'kitchen', 'bedroom', 'living room', 'garden'],
    'ecommerce': ['shop', 'store', 'buy', 'order', 'cart', 'checkout', 'product', 'sale']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matchCount = keywords.filter(keyword => content.includes(keyword)).length;
    if (matchCount >= 2) {
      return category;
    }
  }
  
  return 'default';
}

function calculateEstimatedReach(budget: number, duration: number, audienceSize: string): { reach: number, clicks: number } {
  const baseReach = budget * duration * 800;
  const multiplier = audienceSize === 'broad' ? 1.5 : audienceSize === 'narrow' ? 0.7 : 1;
  const reach = Math.floor(baseReach * multiplier + Math.random() * 5000);
  const clicks = Math.floor(reach * 0.02);
  return { reach, clicks };
}

function selectHooks(category: string): string[] {
  const relevantHooks: string[] = [];
  for (const hookSet of HOOK_LIBRARY) {
    relevantHooks.push(hookSet.hooks[Math.floor(Math.random() * hookSet.hooks.length)]);
  }
  return relevantHooks.slice(0, 3);
}

async function generateAdCopy(scrapedData: ScrapedData, url: string): Promise<any> {
  const detectedCategory = detectProductCategory(scrapedData.text, scrapedData.title);
  const categoryTargeting = CATEGORY_INTEREST_MAP[detectedCategory] || CATEGORY_INTEREST_MAP['default'];
  const hooks = selectHooks(detectedCategory);
  
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
        interests: categoryTargeting.interests,
        ageRange: categoryTargeting.ageRange,
        gender: categoryTargeting.gender,
        demographics: categoryTargeting.demographics
      },
      brandVoice: 'professional',
      productCategory: detectedCategory
    };
  }
}

router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ 
        error: 'Too many requests. Please wait a minute before trying again.',
        retryAfter: 60
      });
    }

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

    const sessionId = uuidv4();
    
    const session = {
      sessionId,
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

    try {
      await BoostDraftModel.create({
        sessionId,
        url,
        title: session.title,
        description: session.description,
        usp: session.usp,
        images: session.images,
        brandColors: session.brandColors,
        pageSpeed: session.pageSpeed,
        pixelDetected: session.pixelDetected,
        adCopy: session.adCopy,
        targetAudience: session.targetAudience,
        productCategory: session.productCategory,
        status: 'draft',
      });
      logger.info('Boost draft saved', { sessionId });
    } catch (dbError) {
      logger.warn('Failed to save boost draft', { error: dbError });
    }

    logger.info('Boost analysis complete', { 
      url, 
      sessionId,
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
    const { 
      session, 
      sessionId,
      selectedAdIndex = 0, 
      budget = 10, 
      duration = 7, 
      targeting, 
      tenantId, 
      adAccountId, 
      pageId,
      headline,
      primaryText,
      selectedImageUrl,
      callToAction = 'Learn More'
    } = req.body;

    if (!tenantId || !adAccountId || !pageId) {
      return res.status(400).json({ 
        error: 'Missing required fields: tenantId, adAccountId, pageId',
        code: 'MISSING_FACEBOOK_CONNECTION'
      });
    }

    if (!session && !sessionId) {
      return res.status(400).json({ 
        error: 'Missing session data. Please analyze a URL first.',
        code: 'MISSING_SESSION'
      });
    }

    let accessToken: string;
    try {
      accessToken = await getAccessToken(tenantId, adAccountId);
    } catch (tokenError) {
      logger.error('Failed to get access token', { tenantId, adAccountId, error: tokenError });
      return res.status(401).json({
        error: 'Facebook connection expired. Please reconnect your account.',
        code: 'TOKEN_EXPIRED'
      });
    }

    const adCopy = session?.adCopy?.[selectedAdIndex] || {};
    const finalHeadline = headline || adCopy.headline || session?.title || 'Check This Out';
    const finalPrimaryText = primaryText || adCopy.primaryText || session?.usp || 'Discover something amazing today.';
    const finalImageUrl = selectedImageUrl || session?.images?.[0] || '';
    const finalCta = callToAction || adCopy.callToAction || 'Learn More';

    const targetingConfig = targeting || {
      ageMin: session?.targetAudience?.ageRange?.min || 25,
      ageMax: session?.targetAudience?.ageRange?.max || 54,
      gender: session?.targetAudience?.gender || 'all',
      countries: ['US'],
      interests: session?.targetAudience?.interests || [],
    };

    logger.info('Launching boost campaign via Meta Graph API', { 
      url: session?.url, 
      budget, 
      duration,
      tenantId,
      adAccountId,
      pageId
    });

    const result = await createBoostCampaign({
      adAccountId,
      accessToken,
      pageId,
      name: session?.title || 'Boost Campaign',
      headline: finalHeadline,
      primaryText: finalPrimaryText,
      imageUrl: finalImageUrl,
      callToAction: finalCta,
      linkUrl: session?.url || 'https://example.com',
      dailyBudget: budget,
      duration,
      targeting: targetingConfig,
    });

    if (!result.success) {
      logger.error('Campaign creation failed', { error: result.error, errorCode: result.errorCode });
      
      if (sessionId) {
        await BoostDraftModel.findOneAndUpdate(
          { sessionId },
          { 
            status: 'failed', 
            errorMessage: result.error,
            updatedAt: new Date()
          }
        );
      }

      const statusCode = result.errorCode === 'TOKEN_EXPIRED' ? 401 : 
                         result.errorCode === 'RATE_LIMITED' ? 429 : 
                         result.errorCode === 'PERMISSION_DENIED' ? 403 : 400;

      return res.status(statusCode).json({
        success: false,
        error: result.error || 'Failed to create campaign on Facebook',
        code: result.errorCode || 'CAMPAIGN_CREATION_FAILED',
        retryable: result.retryable || false
      });
    }

    if (sessionId) {
      await BoostDraftModel.findOneAndUpdate(
        { sessionId },
        { 
          status: 'launched',
          launchedCampaignId: result.campaignId,
          launchedCampaignUrl: result.campaignUrl,
          headline: finalHeadline,
          primaryText: finalPrimaryText,
          selectedImageUrl: finalImageUrl,
          cta: finalCta,
          budget,
          duration,
          targeting: targetingConfig,
          updatedAt: new Date()
        }
      );
    }

    const estimatedReach = Math.floor(budget * duration * 800 + Math.random() * 5000);
    const estimatedClicks = Math.floor(estimatedReach * 0.02);
    
    logger.info('Boost campaign created successfully', { 
      campaignId: result.campaignId,
      adSetId: result.adSetId,
      adId: result.adId
    });

    res.json({
      success: true,
      campaignId: result.campaignId,
      adSetId: result.adSetId,
      adId: result.adId,
      campaignUrl: result.campaignUrl,
      message: 'Campaign created successfully! It will be reviewed by Meta before going live (usually within 24 hours).',
      estimatedReach,
      estimatedClicks,
      totalBudget: budget * duration,
    });
  } catch (error) {
    logger.error('Launch endpoint error', { error });
    next(error);
  }
});

router.get('/drafts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.query;
    
    const query: any = { status: 'draft' };
    if (tenantId) {
      query.tenantId = tenantId;
    }
    
    const drafts = await BoostDraftModel.find(query)
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
    
    res.json({ drafts });
  } catch (error) {
    next(error);
  }
});

router.get('/drafts/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    
    const draft = await BoostDraftModel.findOne({ sessionId }).lean();
    
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    
    res.json(draft);
  } catch (error) {
    next(error);
  }
});

router.put('/drafts/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;
    
    const draft = await BoostDraftModel.findOneAndUpdate(
      { sessionId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    
    res.json(draft);
  } catch (error) {
    next(error);
  }
});

router.post('/reach-estimate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, adAccountId, targeting } = req.body;
    
    if (!tenantId || !adAccountId) {
      return res.json({
        users_lower_bound: 50000,
        users_upper_bound: 500000,
        note: 'Connect Facebook for accurate estimates'
      });
    }
    
    try {
      const accessToken = await getAccessToken(tenantId, adAccountId);
      const estimate = await getReachEstimate(adAccountId, accessToken, {
        ageMin: targeting?.ageMin || 25,
        ageMax: targeting?.ageMax || 54,
        countries: targeting?.countries || ['US'],
        genders: targeting?.gender === 'female' ? [1] : targeting?.gender === 'male' ? [2] : undefined,
      });
      
      res.json(estimate);
    } catch (apiError) {
      logger.warn('Reach estimate API failed, using fallback', { error: apiError });
      res.json({
        users_lower_bound: 50000,
        users_upper_bound: 500000,
        note: 'Estimated based on similar campaigns'
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
