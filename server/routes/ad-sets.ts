import { Router, Request, Response, NextFunction } from 'express';
import { AdSetModel, AdModel } from '../../lib/db/models';
import { logger } from '../../lib/utils/logger';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, campaignId, status, learningPhaseStatus, limit = 50, offset = 0 } = req.query;
    
    const filter: Record<string, unknown> = {};
    if (accountId) filter.accountId = accountId;
    if (campaignId) filter.campaignId = campaignId;
    if (status) filter.status = status;
    if (learningPhaseStatus) filter.learningPhaseStatus = learningPhaseStatus;

    const adSets = await AdSetModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean()
      .exec();

    const total = await AdSetModel.countDocuments(filter).exec();

    res.json({
      data: adSets,
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
    const adSet = await AdSetModel.findOne({ adSetId: req.params.id }).lean().exec();
    
    if (!adSet) {
      return res.status(404).json({ error: 'Ad set not found' });
    }

    res.json({ data: adSet });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/ads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    
    const filter: Record<string, unknown> = { adSetId: req.params.id };
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
    const adSet = await AdSetModel.create(req.body);
    logger.info('Ad set created', { adSetId: adSet.adSetId });
    res.status(201).json({ data: adSet });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingAdSet = await AdSetModel.findOne({ adSetId: req.params.id }).exec();
    
    if (!existingAdSet) {
      return res.status(404).json({ error: 'Ad set not found' });
    }

    if (existingAdSet.learningPhaseStatus === 'LEARNING' && req.body.budget) {
      return res.status(400).json({ 
        error: 'Cannot modify budget during learning phase',
        learningPhaseStatus: existingAdSet.learningPhaseStatus 
      });
    }

    const adSet = await AdSetModel.findOneAndUpdate(
      { adSetId: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean().exec();

    logger.info('Ad set updated', { adSetId: req.params.id });
    res.json({ data: adSet });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adSet = await AdSetModel.findOneAndUpdate(
      { adSetId: req.params.id },
      { $set: { status: 'ARCHIVED' } },
      { new: true }
    ).lean().exec();

    if (!adSet) {
      return res.status(404).json({ error: 'Ad set not found' });
    }

    logger.info('Ad set archived', { adSetId: req.params.id });
    res.json({ data: adSet, message: 'Ad set archived successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adSet = await AdSetModel.findOneAndUpdate(
      { adSetId: req.params.id },
      { $set: { status: 'PAUSED' } },
      { new: true }
    ).lean().exec();

    if (!adSet) {
      return res.status(404).json({ error: 'Ad set not found' });
    }

    logger.info('Ad set paused', { adSetId: req.params.id });
    res.json({ data: adSet });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adSet = await AdSetModel.findOneAndUpdate(
      { adSetId: req.params.id },
      { $set: { status: 'ACTIVE' } },
      { new: true }
    ).lean().exec();

    if (!adSet) {
      return res.status(404).json({ error: 'Ad set not found' });
    }

    logger.info('Ad set activated', { adSetId: req.params.id });
    res.json({ data: adSet });
  } catch (error) {
    next(error);
  }
});

export default router;
