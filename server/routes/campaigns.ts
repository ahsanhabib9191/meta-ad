import { Router, Request, Response, NextFunction } from 'express';
import { CampaignModel, AdSetModel, AdModel } from '../../lib/db/models';
import { logger } from '../../lib/utils/logger';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, status, limit = 50, offset = 0 } = req.query;
    
    const filter: Record<string, unknown> = {};
    if (accountId) filter.accountId = accountId;
    if (status) filter.status = status;

    const campaigns = await CampaignModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean()
      .exec();

    const total = await CampaignModel.countDocuments(filter).exec();

    res.json({
      data: campaigns,
      pagination: {
        total,
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
    const campaign = await CampaignModel.findOne({ campaignId: req.params.id }).lean().exec();
    
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
    
    const filter: Record<string, unknown> = { campaignId: req.params.id };
    if (status) filter.status = status;

    const adSets = await AdSetModel.find(filter)
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    res.json({ data: adSets });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/ads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    
    const filter: Record<string, unknown> = { campaignId: req.params.id };
    if (status) filter.status = status;

    const ads = await AdModel.find(filter)
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    res.json({ data: ads });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await CampaignModel.create(req.body);
    logger.info('Campaign created', { campaignId: campaign.campaignId });
    res.status(201).json({ data: campaign });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await CampaignModel.findOneAndUpdate(
      { campaignId: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean().exec();

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
    const campaign = await CampaignModel.findOneAndUpdate(
      { campaignId: req.params.id },
      { $set: { status: 'ARCHIVED' } },
      { new: true }
    ).lean().exec();

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
