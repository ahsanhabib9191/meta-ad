import { Router, Request, Response, NextFunction } from 'express';
import { AdModel } from '../../lib/db/models';
import { logger } from '../../lib/utils/logger';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, adSetId, campaignId, status, effectiveStatus, limit = 50, offset = 0 } = req.query;
    
    const filter: Record<string, unknown> = {};
    if (accountId) filter.accountId = accountId;
    if (adSetId) filter.adSetId = adSetId;
    if (campaignId) filter.campaignId = campaignId;
    if (status) filter.status = status;
    if (effectiveStatus) filter.effectiveStatus = effectiveStatus;

    const ads = await AdModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean()
      .exec();

    const total = await AdModel.countDocuments(filter).exec();

    res.json({
      data: ads,
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
    const ad = await AdModel.findOne({ adId: req.params.id }).lean().exec();
    
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json({ data: ad });
  } catch (error) {
    next(error);
  }
});

router.get('/issues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, level } = req.query;
    
    const filter: Record<string, unknown> = { 'issues.0': { $exists: true } };
    if (accountId) filter.accountId = accountId;
    if (level) filter['issues.level'] = level;

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
    const ad = await AdModel.create(req.body);
    logger.info('Ad created', { adId: ad.adId });
    res.status(201).json({ data: ad });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ad = await AdModel.findOneAndUpdate(
      { adId: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    logger.info('Ad updated', { adId: req.params.id });
    res.json({ data: ad });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ad = await AdModel.findOneAndUpdate(
      { adId: req.params.id },
      { $set: { status: 'ARCHIVED' } },
      { new: true }
    ).lean().exec();

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    logger.info('Ad archived', { adId: req.params.id });
    res.json({ data: ad, message: 'Ad archived successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adIds, status } = req.body;

    if (!adIds || !Array.isArray(adIds) || adIds.length === 0) {
      return res.status(400).json({ error: 'adIds array is required' });
    }

    if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await AdModel.updateMany(
      { adId: { $in: adIds } },
      { $set: { status } }
    ).exec();

    logger.info('Bulk ad status update', { adIds, status, modifiedCount: result.modifiedCount });
    res.json({ 
      message: 'Ads updated successfully',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ad = await AdModel.findOneAndUpdate(
      { adId: req.params.id },
      { $set: { status: 'PAUSED' } },
      { new: true }
    ).lean().exec();

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    logger.info('Ad paused', { adId: req.params.id });
    res.json({ data: ad });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ad = await AdModel.findOneAndUpdate(
      { adId: req.params.id },
      { $set: { status: 'ACTIVE' } },
      { new: true }
    ).lean().exec();

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    logger.info('Ad activated', { adId: req.params.id });
    res.json({ data: ad });
  } catch (error) {
    next(error);
  }
});

export default router;
