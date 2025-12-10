import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../../lib/utils/logger';
import crypto from 'crypto';

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
    const separator = endpoint.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}access_token=${accessToken}`;
    options.body = JSON.stringify(body);
    const response = await fetch(fullUrl, options);
    return response.json();
  }
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, pixelId } = req.query;

    if (!tenantId || !pixelId) {
      return res.status(400).json({ error: 'tenantId and pixelId are required' });
    }

    const connections = await storage.getMetaConnections(Number(tenantId));
    if (connections.length === 0) {
      return res.status(404).json({ error: 'No Meta connections found' });
    }

    const connection = connections[0];

    const pixelResponse = await metaApiRequest(
      `/${pixelId}?fields=id,name,is_unavailable,data_use_setting`,
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

    let serverEvents = 0;
    let browserEvents = 0;

    if (statsResponse.data) {
      for (const event of statsResponse.data) {
        if (event.value) {
          const count = Number(event.value) || 0;
          if (event.data_source_type === 'SERVER') {
            serverEvents += count;
          } else {
            browserEvents += count;
          }
        }
      }
    }

    const capiStatus = serverEvents > 0 ? 'ACTIVE' : 'INACTIVE';
    const deduplicationRate = (serverEvents > 0 && browserEvents > 0) 
      ? Math.round((Math.min(serverEvents, browserEvents) / Math.max(serverEvents, browserEvents)) * 100)
      : 0;

    res.json({
      data: {
        pixelId,
        pixelName: pixelResponse.name,
        capiStatus,
        serverEvents24h: serverEvents,
        browserEvents24h: browserEvents,
        deduplicationRate: `${deduplicationRate}%`,
        isPixelAvailable: !pixelResponse.is_unavailable,
        dataUseSetting: pixelResponse.data_use_setting,
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, pixelId, events, testEventCode } = req.body;

    if (!tenantId || !pixelId || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'tenantId, pixelId, and events array are required' });
    }

    const connections = await storage.getMetaConnections(Number(tenantId));
    if (connections.length === 0) {
      return res.status(404).json({ error: 'No Meta connections found' });
    }

    const connection = connections[0];

    const formattedEvents = events.map((event: any) => {
      const formattedEvent: any = {
        event_name: event.eventName || event.event_name,
        event_time: event.eventTime || event.event_time || Math.floor(Date.now() / 1000),
        action_source: event.actionSource || event.action_source || 'website',
        event_source_url: event.eventSourceUrl || event.event_source_url,
        user_data: {},
      };

      if (event.eventId || event.event_id) {
        formattedEvent.event_id = event.eventId || event.event_id;
      }

      const userData = event.userData || event.user_data || {};
      
      if (userData.email) {
        formattedEvent.user_data.em = [hashValue(userData.email)];
      }
      if (userData.phone) {
        formattedEvent.user_data.ph = [hashValue(userData.phone.replace(/\D/g, ''))];
      }
      if (userData.firstName) {
        formattedEvent.user_data.fn = [hashValue(userData.firstName)];
      }
      if (userData.lastName) {
        formattedEvent.user_data.ln = [hashValue(userData.lastName)];
      }
      if (userData.city) {
        formattedEvent.user_data.ct = [hashValue(userData.city)];
      }
      if (userData.state) {
        formattedEvent.user_data.st = [hashValue(userData.state)];
      }
      if (userData.zipCode) {
        formattedEvent.user_data.zp = [hashValue(userData.zipCode)];
      }
      if (userData.country) {
        formattedEvent.user_data.country = [hashValue(userData.country)];
      }
      if (userData.externalId) {
        formattedEvent.user_data.external_id = [hashValue(userData.externalId)];
      }
      if (userData.clientIpAddress) {
        formattedEvent.user_data.client_ip_address = userData.clientIpAddress;
      }
      if (userData.clientUserAgent) {
        formattedEvent.user_data.client_user_agent = userData.clientUserAgent;
      }
      if (userData.fbc) {
        formattedEvent.user_data.fbc = userData.fbc;
      }
      if (userData.fbp) {
        formattedEvent.user_data.fbp = userData.fbp;
      }

      if (event.customData || event.custom_data) {
        formattedEvent.custom_data = event.customData || event.custom_data;
      }

      return formattedEvent;
    });

    const payload: any = { data: formattedEvents };
    
    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    const response = await metaApiRequest(
      `/${pixelId}/events`,
      connection.accessToken,
      'POST',
      payload
    );

    if (response.error) {
      logger.error('CAPI error sending events', { error: response.error, pixelId });
      return res.status(400).json({ error: response.error.message });
    }

    logger.info('CAPI events sent successfully', { 
      pixelId, 
      eventCount: events.length,
      eventsReceived: response.events_received 
    });

    res.json({
      data: {
        success: true,
        eventsReceived: response.events_received,
        messages: response.messages || [],
        fbTraceId: response.fbtrace_id,
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/event-match-quality', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, pixelId } = req.query;

    if (!tenantId || !pixelId) {
      return res.status(400).json({ error: 'tenantId and pixelId are required' });
    }

    const connections = await storage.getMetaConnections(Number(tenantId));
    if (connections.length === 0) {
      return res.status(404).json({ error: 'No Meta connections found' });
    }

    const connection = connections[0];

    const now = Math.floor(Date.now() / 1000);
    const last7Days = now - (7 * 24 * 60 * 60);

    const response = await metaApiRequest(
      `/${pixelId}/stats?start_time=${last7Days}&end_time=${now}&aggregation=event&fields=data`,
      connection.accessToken
    );

    if (response.error) {
      return res.status(400).json({ error: response.error.message });
    }

    const emqResponse = await metaApiRequest(
      `/${pixelId}?fields=event_match_quality`,
      connection.accessToken
    );

    let eventMatchQuality = null;
    if (emqResponse.event_match_quality) {
      eventMatchQuality = emqResponse.event_match_quality;
    }

    const recommendations = [];
    
    if (!eventMatchQuality || eventMatchQuality < 6) {
      recommendations.push('Add more customer information parameters (email, phone, name) to improve match quality');
      recommendations.push('Ensure Advanced Matching is enabled on your pixel');
      recommendations.push('Hash all PII data using SHA-256 before sending');
    }

    res.json({
      data: {
        pixelId,
        eventMatchQuality: eventMatchQuality || 'Not available',
        eventMatchQualityScore: typeof eventMatchQuality === 'number' ? `${eventMatchQuality}/10` : 'N/A',
        recommendations,
        parameters: {
          required: ['event_name', 'event_time', 'user_data', 'action_source'],
          recommended: ['email (em)', 'phone (ph)', 'first_name (fn)', 'last_name (ln)', 'external_id', 'fbc', 'fbp'],
          optional: ['city (ct)', 'state (st)', 'zip (zp)', 'country', 'gender (ge)', 'date_of_birth (db)'],
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/test-event', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, pixelId, testEventCode, eventName, userData } = req.body;

    if (!tenantId || !pixelId || !testEventCode) {
      return res.status(400).json({ error: 'tenantId, pixelId, and testEventCode are required' });
    }

    const connections = await storage.getMetaConnections(Number(tenantId));
    if (connections.length === 0) {
      return res.status(404).json({ error: 'No Meta connections found' });
    }

    const connection = connections[0];

    const testEvent = {
      event_name: eventName || 'TestEvent',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: 'https://test.example.com',
      event_id: `test_${Date.now()}`,
      user_data: {
        client_ip_address: '0.0.0.0',
        client_user_agent: 'Mozilla/5.0 (Test)',
      },
    };

    if (userData?.email) {
      (testEvent.user_data as any).em = [hashValue(userData.email)];
    }
    if (userData?.phone) {
      (testEvent.user_data as any).ph = [hashValue(userData.phone)];
    }

    const payload = {
      data: [testEvent],
      test_event_code: testEventCode,
    };

    const response = await metaApiRequest(
      `/${pixelId}/events`,
      connection.accessToken,
      'POST',
      payload
    );

    if (response.error) {
      logger.error('CAPI test event error', { error: response.error, pixelId });
      return res.status(400).json({ error: response.error.message });
    }

    logger.info('CAPI test event sent', { pixelId, testEventCode });

    res.json({
      data: {
        success: true,
        message: 'Test event sent successfully. Check Events Manager to verify.',
        eventsReceived: response.events_received,
        testEventCode,
        eventId: testEvent.event_id,
        instructions: [
          '1. Go to Facebook Events Manager',
          '2. Select your pixel',
          '3. Click "Test Events" tab',
          `4. Your test event with code "${testEventCode}" should appear`,
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/diagnostics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, pixelId } = req.query;

    if (!tenantId || !pixelId) {
      return res.status(400).json({ error: 'tenantId and pixelId are required' });
    }

    const connections = await storage.getMetaConnections(Number(tenantId));
    if (connections.length === 0) {
      return res.status(404).json({ error: 'No Meta connections found' });
    }

    const connection = connections[0];

    const pixelResponse = await metaApiRequest(
      `/${pixelId}?fields=id,name,is_unavailable,data_use_setting,first_party_cookie_status,automatic_matching_fields,enable_automatic_matching`,
      connection.accessToken
    );

    if (pixelResponse.error) {
      return res.status(400).json({ error: pixelResponse.error.message });
    }

    const now = Math.floor(Date.now() / 1000);
    const last24h = now - (24 * 60 * 60);
    const last7Days = now - (7 * 24 * 60 * 60);

    const [stats24h, stats7d] = await Promise.all([
      metaApiRequest(
        `/${pixelId}/stats?start_time=${last24h}&end_time=${now}&aggregation=event`,
        connection.accessToken
      ),
      metaApiRequest(
        `/${pixelId}/stats?start_time=${last7Days}&end_time=${now}&aggregation=event`,
        connection.accessToken
      ),
    ]);

    let serverEvents24h = 0;
    let browserEvents24h = 0;
    let serverEvents7d = 0;
    let browserEvents7d = 0;

    if (stats24h.data) {
      for (const event of stats24h.data) {
        const count = Number(event.value) || 0;
        if (event.data_source_type === 'SERVER') {
          serverEvents24h += count;
        } else {
          browserEvents24h += count;
        }
      }
    }

    if (stats7d.data) {
      for (const event of stats7d.data) {
        const count = Number(event.value) || 0;
        if (event.data_source_type === 'SERVER') {
          serverEvents7d += count;
        } else {
          browserEvents7d += count;
        }
      }
    }

    const issues = [];
    const recommendations = [];

    if (serverEvents24h === 0) {
      issues.push({
        severity: 'HIGH',
        issue: 'No server events received in last 24 hours',
        recommendation: 'Check your CAPI integration and ensure events are being sent',
      });
    }

    if (browserEvents24h > 0 && serverEvents24h === 0) {
      issues.push({
        severity: 'MEDIUM',
        issue: 'Browser pixel is firing but no CAPI events',
        recommendation: 'Implement Conversions API to improve event reliability and iOS 14+ tracking',
      });
    }

    if (serverEvents24h > 0 && browserEvents24h > 0) {
      const matchRate = Math.min(serverEvents24h, browserEvents24h) / Math.max(serverEvents24h, browserEvents24h);
      if (matchRate < 0.8) {
        issues.push({
          severity: 'MEDIUM',
          issue: 'Low deduplication rate between browser and server events',
          recommendation: 'Ensure you are sending matching event_id for both browser and server events',
        });
      }
    }

    if (!pixelResponse.enable_automatic_matching) {
      recommendations.push('Enable Advanced Matching to improve conversion tracking');
    }

    res.json({
      data: {
        pixelId,
        pixelName: pixelResponse.name,
        status: {
          isAvailable: !pixelResponse.is_unavailable,
          dataUseSetting: pixelResponse.data_use_setting,
          firstPartyCookieStatus: pixelResponse.first_party_cookie_status,
          automaticMatchingEnabled: pixelResponse.enable_automatic_matching,
          automaticMatchingFields: pixelResponse.automatic_matching_fields || [],
        },
        metrics: {
          last24Hours: {
            serverEvents: serverEvents24h,
            browserEvents: browserEvents24h,
            total: serverEvents24h + browserEvents24h,
          },
          last7Days: {
            serverEvents: serverEvents7d,
            browserEvents: browserEvents7d,
            total: serverEvents7d + browserEvents7d,
          },
        },
        issues,
        recommendations,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
