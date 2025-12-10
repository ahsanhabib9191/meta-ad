import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../../lib/utils/logger';

const router = Router();

const META_API_VERSION = process.env.META_API_VERSION || 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

async function metaApiRequest(endpoint: string, accessToken: string, method: string = 'GET', body?: any) {
  const url = `${META_API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (method === 'GET') {
    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}access_token=${accessToken}`;
    const response = await fetch(fullUrl, options);
    return response.json();
  } else {
    options.body = JSON.stringify({ ...body, access_token: accessToken });
    const response = await fetch(url, options);
    return response.json();
  }
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, adAccountId } = req.query;

    if (!tenantId || !adAccountId) {
      return res.status(400).json({ error: 'tenantId and adAccountId are required' });
    }

    const connection = await storage.getMetaConnectionByAccount(Number(tenantId), adAccountId as string);
    if (!connection) {
      return res.status(404).json({ error: 'No Meta connection found for this account' });
    }

    const accountIdWithPrefix = adAccountId.toString().startsWith('act_') 
      ? adAccountId 
      : `act_${adAccountId}`;

    const response = await metaApiRequest(
      `/${accountIdWithPrefix}/adspixels?fields=id,name,code,creation_time,last_fired_time,is_unavailable,data_use_setting,enable_automatic_matching,automatic_matching_fields`,
      connection.accessToken
    );

    if (response.error) {
      logger.error('Meta API error fetching pixels', { error: response.error });
      return res.status(400).json({ error: response.error.message });
    }

    res.json({ data: response.data || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.query;
    const pixelId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const connections = await storage.getMetaConnections(Number(tenantId));
    if (connections.length === 0) {
      return res.status(404).json({ error: 'No Meta connections found' });
    }

    const connection = connections[0];

    const response = await metaApiRequest(
      `/${pixelId}?fields=id,name,code,creation_time,last_fired_time,is_unavailable,data_use_setting,enable_automatic_matching,automatic_matching_fields,first_party_cookie_status`,
      connection.accessToken
    );

    if (response.error) {
      logger.error('Meta API error fetching pixel', { error: response.error, pixelId });
      return res.status(400).json({ error: response.error.message });
    }

    res.json({ data: response });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, startTime, endTime } = req.query;
    const pixelId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const connections = await storage.getMetaConnections(Number(tenantId));
    if (connections.length === 0) {
      return res.status(404).json({ error: 'No Meta connections found' });
    }

    const connection = connections[0];

    const now = Math.floor(Date.now() / 1000);
    const defaultStartTime = now - (7 * 24 * 60 * 60);
    
    const start = startTime ? Number(startTime) : defaultStartTime;
    const end = endTime ? Number(endTime) : now;

    const response = await metaApiRequest(
      `/${pixelId}/stats?start_time=${start}&end_time=${end}&aggregation=event`,
      connection.accessToken
    );

    if (response.error) {
      logger.error('Meta API error fetching pixel stats', { error: response.error, pixelId });
      return res.status(400).json({ error: response.error.message });
    }

    res.json({ data: response.data || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, domain } = req.body;
    const pixelId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const connections = await storage.getMetaConnections(Number(tenantId));
    if (connections.length === 0) {
      return res.status(404).json({ error: 'No Meta connections found' });
    }

    const connection = connections[0];

    const pixelResponse = await metaApiRequest(
      `/${pixelId}?fields=id,name,last_fired_time,is_unavailable`,
      connection.accessToken
    );

    if (pixelResponse.error) {
      return res.status(400).json({ error: pixelResponse.error.message });
    }

    const now = Math.floor(Date.now() / 1000);
    const last24h = now - (24 * 60 * 60);
    
    const statsResponse = await metaApiRequest(
      `/${pixelId}/stats?start_time=${last24h}&end_time=${now}&aggregation=event`,
      connection.accessToken
    );

    const hasRecentEvents = statsResponse.data && statsResponse.data.length > 0;
    const isPixelActive = !pixelResponse.is_unavailable;
    const lastFiredTime = pixelResponse.last_fired_time;

    let status = 'NOT_VERIFIED';
    let message = 'Pixel has not received any events';

    if (isPixelActive && hasRecentEvents) {
      status = 'VERIFIED';
      message = 'Pixel is active and receiving events';
    } else if (isPixelActive && lastFiredTime) {
      const lastFiredDate = new Date(lastFiredTime);
      const hoursSinceLastFire = (Date.now() - lastFiredDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastFire < 24) {
        status = 'VERIFIED';
        message = 'Pixel is active and recently received events';
      } else if (hoursSinceLastFire < 168) {
        status = 'WARNING';
        message = `Pixel last fired ${Math.round(hoursSinceLastFire)} hours ago`;
      } else {
        status = 'STALE';
        message = 'Pixel has not received events in over a week';
      }
    }

    logger.info('Pixel verification completed', { pixelId, status });

    res.json({
      data: {
        pixelId,
        pixelName: pixelResponse.name,
        status,
        message,
        lastFiredTime,
        isAvailable: isPixelActive,
        recentEvents: statsResponse.data || [],
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, limit } = req.query;
    const pixelId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const connections = await storage.getMetaConnections(Number(tenantId));
    if (connections.length === 0) {
      return res.status(404).json({ error: 'No Meta connections found' });
    }

    const connection = connections[0];

    const now = Math.floor(Date.now() / 1000);
    const last7Days = now - (7 * 24 * 60 * 60);

    const response = await metaApiRequest(
      `/${pixelId}/stats?start_time=${last7Days}&end_time=${now}&aggregation=event`,
      connection.accessToken
    );

    if (response.error) {
      logger.error('Meta API error fetching pixel events', { error: response.error, pixelId });
      return res.status(400).json({ error: response.error.message });
    }

    const events = response.data || [];
    const limitNum = limit ? Number(limit) : 100;

    res.json({ data: events.slice(0, limitNum) });
  } catch (error) {
    next(error);
  }
});

export default router;
