import { Router, Request, Response, NextFunction } from 'express';
import { MetaConnectionModel, TenantModel } from '../../lib/db/models';
import { generateAuthorizationUrl, exchangeCodeForToken, getUserAdAccounts, getUserInfo } from '../../lib/services/meta-oauth/oauth-service';
import { logger } from '../../lib/utils/logger';
import crypto from 'crypto';

const router = Router();

router.get('/meta/connect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const state = crypto.randomBytes(32).toString('hex');
    
    const authUrl = generateAuthorizationUrl(state);

    res.json({ 
      authUrl,
      state,
      message: 'Redirect user to authUrl to connect their Meta account'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/meta/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, tenantId, adAccountId } = req.body;

    if (!code || !tenantId) {
      return res.status(400).json({ error: 'code and tenantId are required' });
    }

    const tokenResponse = await exchangeCodeForToken(code);
    
    const userInfo = await getUserInfo(tokenResponse.access_token);
    const adAccounts = await getUserAdAccounts(tokenResponse.access_token, userInfo.id);

    if (adAccounts.length === 0) {
      return res.status(400).json({ error: 'No ad accounts found for this user' });
    }

    const selectedAccount = adAccountId 
      ? adAccounts.find(a => a.account_id === adAccountId || a.id === adAccountId) || adAccounts[0]
      : adAccounts[0];

    const expiresAt = tokenResponse.expires_in 
      ? new Date(Date.now() + tokenResponse.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const connection = await MetaConnectionModel.create({
      tenantId,
      adAccountId: selectedAccount.account_id,
      accessToken: tokenResponse.access_token,
      status: 'ACTIVE',
      permissions: [],
      tokenExpiresAt: expiresAt,
    });

    logger.info('Meta connection created', { 
      tenantId, 
      adAccountId: selectedAccount.account_id 
    });

    res.json({
      data: {
        connectionId: connection._id,
        adAccountId: selectedAccount.account_id,
        adAccountIdPrefixed: selectedAccount.id,
        adAccountName: selectedAccount.name,
        availableAccounts: adAccounts,
      },
      message: 'Meta account connected successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/meta/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken } = req.query;

    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken is required' });
    }

    const userInfo = await getUserInfo(accessToken as string);
    const adAccounts = await getUserAdAccounts(accessToken as string, userInfo.id);

    res.json({ data: adAccounts });
  } catch (error) {
    next(error);
  }
});

router.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.query;

    const filter: Record<string, unknown> = {};
    if (tenantId) filter.tenantId = tenantId;

    const connections = await MetaConnectionModel.find(filter)
      .select('-accessToken -refreshToken')
      .lean()
      .exec();

    res.json({ data: connections });
  } catch (error) {
    next(error);
  }
});

router.delete('/connections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connection = await MetaConnectionModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'REVOKED' } },
      { new: true }
    ).select('-accessToken -refreshToken').lean().exec();

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    logger.info('Meta connection disconnected', { connectionId: req.params.id });
    res.json({ data: connection, message: 'Connection disconnected' });
  } catch (error) {
    next(error);
  }
});

router.post('/tenant', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, planTier = 'FREE' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const existingTenant = await TenantModel.findOne({ email }).exec();
    if (existingTenant) {
      return res.status(400).json({ error: 'Tenant with this email already exists' });
    }

    const tenant = await TenantModel.create({
      name,
      email,
      planTier,
    });

    logger.info('Tenant created', { tenantId: tenant._id, email });

    res.status(201).json({ data: tenant });
  } catch (error) {
    next(error);
  }
});

router.get('/tenant/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await TenantModel.findById(req.params.id).lean().exec();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ data: tenant });
  } catch (error) {
    next(error);
  }
});

export default router;
