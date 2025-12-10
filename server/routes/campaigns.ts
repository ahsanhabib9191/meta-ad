import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../../lib/utils/logger';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, limit = 50, offset = 0 } = req.query;
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    const campaigns = await storage.getCampaigns(
      accountId as string,
      Number(limit),
      Number(offset)
    );

    res.json({
      data: campaigns,
      pagination: {
        total: campaigns.length,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await storage.getCampaign(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ data: campaign });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/ad-sets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    
    const adSets = await storage.getAdSets({
      campaignId: req.params.id,
      status: status as string | undefined,
    });

    res.json({ data: adSets });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/ads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    
    const ads = await storage.getAds({
      campaignId: req.params.id,
      status: status as string | undefined,
    });

    res.json({ data: ads });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await storage.createCampaign(req.body);
    logger.info('Campaign created', { campaignId: campaign.campaignId });
    res.status(201).json({ data: campaign });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await storage.updateCampaign(req.params.id, req.body);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    logger.info('Campaign updated', { campaignId: req.params.id });
    res.json({ data: campaign });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await storage.updateCampaign(req.params.id, { status: 'ARCHIVED' });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    logger.info('Campaign archived', { campaignId: req.params.id });
    res.json({ data: campaign, message: 'Campaign archived successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
