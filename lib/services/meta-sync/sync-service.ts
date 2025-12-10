import { AdModel } from '../../db/models/ad';
import { AdSetModel, ITargeting } from '../../db/models/ad-set';
import { CampaignModel } from '../../db/models/campaign';
import {
  IMetaConnection,
  MetaConnectionModel,
} from '../../db/models/MetaConnection';
import { PerformanceSnapshotModel, EntityType } from '../../db/models/performance-snapshot';
import logger from '../../utils/logger';
import { redis } from '../../db/redis';
import {
  buildGraphEdgeParams,
  ensureConnectionAccessToken,
  fetchGraphEdges,
  fetchGraphNode,
  fetchInsights,
  MetaAPIError,
} from './graph-client';

interface GraphCampaign {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  daily_budget?: string;
  start_time?: string;
  stop_time?: string;
}

interface GraphAdSet {
  id: string;
  name: string;
  status?: string;
  daily_budget?: string;
  targeting?: Record<string, any>;
  optimization_goal?: string;
  learning_phase_status?: string;
  start_time?: string;
  end_time?: string;
  campaign_id?: string;
  delivery_info?: Record<string, any>;
}

interface GraphAd {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  adset_id?: string;
  creative?: Record<string, any>;
  issues_info?: Array<{
    error_code: number;
    error_message: string;
    error_summary: string;
    level: string;
  }>;
}

interface GraphInsights {
  date_start: string;
  date_stop: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

const campaignFields = [
  'id',
  'name',
  'status',
  'objective',
  'daily_budget',
  'start_time',
  'stop_time',
];

const adSetFields = [
  'id',
  'name',
  'status',
  'daily_budget',
  'targeting',
  'optimization_goal',
  'learning_phase_status',
  'start_time',
  'end_time',
  'campaign_id',
  'delivery_info',
];

const adFields = [
  'id',
  'name',
  'status',
  'effective_status',
  'adset_id',
  'creative',
  'issues_info',
];

const insightFields = [
  'impressions',
  'clicks',
  'spend',
  'actions',
  'action_values',
  'conversions',
  'conversion_values',
];

const campaignStatusMap: Record<string, string> = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  ARCHIVED: 'ARCHIVED',
  DRAFT: 'DRAFT',
  LEARNING: 'LEARNING',
  LEARNING_LIMITED: 'LEARNING_LIMITED',
};

const adSetStatusMap: Record<string, string> = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  ARCHIVED: 'ARCHIVED',
};

const adStatusMap: Record<string, string> = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  ARCHIVED: 'ARCHIVED',
  DRAFT: 'DRAFT',
};

const adEffectiveStatusMap: Record<string, string> = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DISAPPROVED: 'DISAPPROVED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  ARCHIVED: 'ARCHIVED',
  DELETED: 'DELETED',
  ADSET_PAUSED: 'ADSET_PAUSED',
  CAMPAIGN_PAUSED: 'CAMPAIGN_PAUSED',
};

function normalizeCampaignStatus(status?: string): string {
  if (!status) return 'DRAFT';
  return campaignStatusMap[status] || 'DRAFT';
}

function normalizeAdSetStatus(status?: string): string {
  if (!status) return 'DRAFT';
  return adSetStatusMap[status] || 'DRAFT';
}

function normalizeLearningPhase(status?: string): string {
  if (!status) return 'NOT_STARTED';
  const upper = status.toUpperCase();
  if (upper.includes('LEARNING')) return 'LEARNING';
  if (upper.includes('ACTIVE')) return 'ACTIVE';
  return 'NOT_STARTED';
}

function normalizeAdStatus(status?: string): string {
  if (!status) return 'DRAFT';
  return adStatusMap[status] || 'DRAFT';
}

function normalizeAdEffectiveStatus(status?: string): string {
  if (!status) return 'PAUSED';
  return adEffectiveStatusMap[status] || 'PAUSED';
}

function mapTargeting(targeting?: Record<string, any>): ITargeting {
  if (!targeting) {
    return {};
  }

  const countries:
    | string[]
    | undefined = targeting.geo_locations?.countries?.map((c: any) => c.key) ?? targeting.geo_locations?.countries;
  const locations: string[] = [];
  if (countries) {
    locations.push(...countries.filter(Boolean));
  }

  return {
    audienceSize: targeting.app_store_audience_size,
    ageMin: targeting.age_min,
    ageMax: targeting.age_max,
    genders: targeting.genders,
    locations,
    interests: targeting.interests?.map((interest: any) => interest.name),
    customAudiences: targeting.custom_audiences,
    lookalikes: targeting.lookalike_specs?.map((lookalike: any) => lookalike.name),
    exclusions: targeting.excluded_custom_audiences,
  };
}

function mapCreative(creative?: Record<string, any>): Record<string, any> {
  if (!creative) {
    return {};
  }

  return {
    creativeId: creative.id,
    type: creative.asset_feed_spec?.attachment_style || creative.object_story_spec?.link_data?.link, // best effort
    headline: creative.title || creative.headline || creative.name,
    body: creative.body || creative.message,
    callToAction:
      (creative.object_story_spec?.link_data?.call_to_action?.type as string) || creative.call_to_action?.type,
    linkUrl: creative.link_url || creative.object_story_spec?.link_data?.link,
    metadata: creative,
  };
}

export async function upsertCampaignFromGraph(payload: GraphCampaign, accountId: string) {
  const mapped = {
    campaignId: payload.id,
    accountId,
    name: payload.name,
    objective: payload.objective ?? 'OUTCOME_TRAFFIC',
    status: normalizeCampaignStatus(payload.status),
    budget: payload.daily_budget ? Number(payload.daily_budget) : 0,
    startDate: payload.start_time ? new Date(payload.start_time) : undefined,
    endDate: payload.stop_time ? new Date(payload.stop_time) : undefined,
  };

  return CampaignModel.findOneAndUpdate({ campaignId: payload.id }, mapped, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).exec();
}

export async function upsertAdSetFromGraph(payload: GraphAdSet, accountId: string) {
  const mapped = {
    adSetId: payload.id,
    campaignId: payload.campaign_id || '',
    accountId,
    name: payload.name,
    status: normalizeAdSetStatus(payload.status),
    budget: payload.daily_budget ? Number(payload.daily_budget) : 0,
    targeting: mapTargeting(payload.targeting),
    learningPhaseStatus: normalizeLearningPhase(payload.learning_phase_status),
    optimizationGoal: payload.optimization_goal || 'LINK_CLICKS',
    startDate: payload.start_time ? new Date(payload.start_time) : undefined,
    endDate: payload.end_time ? new Date(payload.end_time) : undefined,
    deliveryStatus: payload.delivery_info?.status,
    optimizationEventsCount: payload.delivery_info?.daily_spend
      ? Number(payload.delivery_info.daily_spend)
      : undefined,
  };

  return AdSetModel.findOneAndUpdate({ adSetId: payload.id }, mapped, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).exec();
}

export async function upsertAdFromGraph(payload: GraphAd, accountId: string, campaignId?: string) {
  const mapped = {
    adId: payload.id,
    adSetId: payload.adset_id || '',
    campaignId: campaignId || '',
    accountId,
    name: payload.name,
    status: normalizeAdStatus(payload.status),
    creative: mapCreative(payload.creative),
    effectiveStatus: normalizeAdEffectiveStatus(payload.effective_status),
    issues: mapIssues(payload.effective_status, payload.issues_info),
  };

  return AdModel.findOneAndUpdate({ adId: payload.id }, mapped, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).exec();
}

function mapIssues(effectiveStatus?: string, issuesInfo?: Array<any>) {
  const issues: Array<any> = [];

  if (issuesInfo && issuesInfo.length > 0) {
    issues.push(...issuesInfo.map(issue => ({
      errorCode: String(issue.error_code),
      errorMessage: issue.error_message,
      errorSummary: issue.error_summary,
      level: issue.level === 'ERROR' ? 'ERROR' : 'WARNING',
    })));
  }

  if (effectiveStatus?.toUpperCase() === 'DISAPPROVED' && issues.length === 0) {
    issues.push({
      errorCode: 'DISAPPROVED',
      errorMessage: 'Ad disapproved by Meta',
      level: 'ERROR',
    });
  }

  return issues;
}

function extractConversions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  
  const conversionActions = actions.filter(action => 
    action.action_type.includes('purchase') || 
    action.action_type.includes('lead') ||
    action.action_type.includes('conversion')
  );
  
  return conversionActions.reduce((sum, action) => sum + parseFloat(action.value || '0'), 0);
}

function extractRevenue(actionValues?: Array<{ action_type: string; value: string }>): number {
  if (!actionValues) return 0;
  
  const purchaseValues = actionValues.filter(action => 
    action.action_type.includes('purchase') ||
    action.action_type.includes('revenue')
  );
  
  return purchaseValues.reduce((sum, action) => sum + parseFloat(action.value || '0'), 0);
}

export async function upsertPerformanceSnapshot(
  entityType: EntityType,
  entityId: string,
  insights: GraphInsights
) {
  const date = new Date(insights.date_start);
  date.setHours(0, 0, 0, 0); // Normalize to start of day

  const mapped = {
    entityType,
    entityId,
    date,
    impressions: parseInt(insights.impressions || '0'),
    clicks: parseInt(insights.clicks || '0'),
    spend: parseFloat(insights.spend || '0'),
    conversions: extractConversions(insights.actions),
    revenue: extractRevenue(insights.action_values),
  };

  return PerformanceSnapshotModel.findOneAndUpdate(
    { entityType, entityId, date },
    mapped,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).exec();
}

export async function syncPerformanceData(
  connection: IMetaConnection,
  entityType: EntityType,
  entityId: string,
  datePreset: string = 'last_7d'
): Promise<number> {
  try {
    const { accessToken } = await ensureConnectionAccessToken(connection);
    const userId = connection.tenantId;

    const params = {
      fields: insightFields.join(','),
      date_preset: datePreset,
      time_increment: '1', // Daily granularity
    };

    const insights = await fetchInsights<GraphInsights>(
      accessToken,
      entityId,
      params,
      userId
    );

    if (!insights || insights.length === 0) {
      logger.debug('No insights data available', { entityType, entityId });
      return 0;
    }

    await Promise.all(
      insights.map(insight => upsertPerformanceSnapshot(entityType, entityId, insight))
    );

    logger.info('Performance data synced', {
      entityType,
      entityId,
      snapshotCount: insights.length,
    });

    return insights.length;
  } catch (error) {
    logger.error('Failed to sync performance data', {
      entityType,
      entityId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function syncAllPerformanceData(
  connection: IMetaConnection,
  datePreset: string = 'last_7d'
): Promise<{ campaigns: number; adSets: number; ads: number }> {
  const accountId = connection.adAccountId;
  
  // Fetch all entity IDs
  const [campaigns, adSets, ads] = await Promise.all([
    CampaignModel.find({ accountId, status: { $ne: 'ARCHIVED' } })
      .select('campaignId')
      .lean()
      .exec(),
    AdSetModel.find({ accountId, status: { $ne: 'ARCHIVED' } })
      .select('adSetId')
      .lean()
      .exec(),
    AdModel.find({ accountId, status: { $ne: 'ARCHIVED' } })
      .select('adId')
      .lean()
      .exec(),
  ]);

  let campaignSnapshots = 0;
  let adSetSnapshots = 0;
  let adSnapshots = 0;

  // Sync performance data for campaigns
  for (const campaign of campaigns) {
    try {
      const count = await syncPerformanceData(
        connection,
        'CAMPAIGN',
        campaign.campaignId,
        datePreset
      );
      campaignSnapshots += count;
    } catch (error) {
      logger.error('Failed to sync campaign performance', {
        campaignId: campaign.campaignId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Sync performance data for ad sets
  for (const adSet of adSets) {
    try {
      const count = await syncPerformanceData(
        connection,
        'AD_SET',
        adSet.adSetId,
        datePreset
      );
      adSetSnapshots += count;
    } catch (error) {
      logger.error('Failed to sync ad set performance', {
        adSetId: adSet.adSetId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Sync performance data for ads
  for (const ad of ads) {
    try {
      const count = await syncPerformanceData(
        connection,
        'AD',
        ad.adId,
        datePreset
      );
      adSnapshots += count;
    } catch (error) {
      logger.error('Failed to sync ad performance', {
        adId: ad.adId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info('All performance data synced', {
    tenantId: connection.tenantId,
    adAccountId: accountId,
    campaignSnapshots,
    adSetSnapshots,
    adSnapshots,
  });

  return {
    campaigns: campaignSnapshots,
    adSets: adSetSnapshots,
    ads: adSnapshots,
  };
}

export async function syncMetaConnection(connection: IMetaConnection, syncPerformance = false) {
  const syncStartTime = Date.now();
  const { connection: safeConnection, accessToken } = await ensureConnectionAccessToken(connection);
  const accountId = safeConnection.adAccountId;
  const userId = safeConnection.tenantId;

  try {
    // Fetch campaigns, adsets, and ads in parallel for better performance
    const [campaigns, adSets, ads] = await Promise.all([
      fetchGraphEdges<GraphCampaign>(
        accessToken,
        `${accountId}/campaigns`,
        buildGraphEdgeParams(campaignFields),
        userId
      ),
      fetchGraphEdges<GraphAdSet>(
        accessToken,
        `${accountId}/adsets`,
        buildGraphEdgeParams(adSetFields),
        userId
      ),
      fetchGraphEdges<GraphAd>(
        accessToken,
        `${accountId}/ads`,
        buildGraphEdgeParams(adFields),
        userId
      ),
    ]);

    // Build campaign ID map for ad set → campaign relationship
    const campaignIdMap = new Map(campaigns.map(c => [c.id, c.id]));
    
    // Build ad set → campaign map
    const adSetCampaignMap = new Map(
      adSets.map(as => [as.id, as.campaign_id || ''])
    );

    // Upsert all entities in parallel
    await Promise.all([
      ...campaigns.map((payload) => upsertCampaignFromGraph(payload, accountId)),
      ...adSets.map((payload) => upsertAdSetFromGraph(payload, accountId)),
      ...ads.map((payload) => {
        const campaignId = adSetCampaignMap.get(payload.adset_id || '');
        return upsertAdFromGraph(payload, accountId, campaignId);
      }),
    ]);

    await MetaConnectionModel.findByIdAndUpdate(safeConnection._id, { 
      lastSyncedAt: new Date(),
      status: 'ACTIVE',
    }).exec();

    const syncDuration = Date.now() - syncStartTime;

    logger.info('Meta connection synced', {
      tenantId: safeConnection.tenantId,
      adAccountId: accountId,
      campaignCount: campaigns.length,
      adSetCount: adSets.length,
      adCount: ads.length,
      durationMs: syncDuration,
    });

    // Optionally sync performance data
    let performanceStats;
    if (syncPerformance) {
      performanceStats = await syncAllPerformanceData(safeConnection);
    }

    return {
      campaignsSynced: campaigns.length,
      adSetsSynced: adSets.length,
      adsSynced: ads.length,
      durationMs: syncDuration,
      performanceStats,
    };
  } catch (error) {
    if (error instanceof MetaAPIError) {
      if (error.code === 190) {
        // Token expired - mark connection as expired
        await MetaConnectionModel.findByIdAndUpdate(safeConnection._id, {
          status: 'EXPIRED',
        }).exec();
        logger.error('Meta connection token expired', {
          tenantId: safeConnection.tenantId,
          adAccountId: accountId,
        });
      }
    }

    logger.error('Meta connection sync failed', {
      tenantId: safeConnection.tenantId,
      adAccountId: accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

export async function syncCampaignFromWebhook(connection: IMetaConnection, campaignId: string) {
  try {
    const { accessToken } = await ensureConnectionAccessToken(connection);
    const userId = connection.tenantId;
    const payload = await fetchGraphNode<GraphCampaign>(
      accessToken,
      `${campaignId}`,
      { fields: campaignFields.join(',') },
      userId
    );

    const result = await upsertCampaignFromGraph(payload, connection.adAccountId);
    
    logger.info('Campaign synced from webhook', {
      tenantId: connection.tenantId,
      campaignId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to sync campaign from webhook', {
      tenantId: connection.tenantId,
      campaignId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function syncAdSetFromWebhook(connection: IMetaConnection, adSetId: string) {
  try {
    const { accessToken } = await ensureConnectionAccessToken(connection);
    const userId = connection.tenantId;
    const payload = await fetchGraphNode<GraphAdSet>(
      accessToken,
      `${adSetId}`,
      { fields: adSetFields.join(',') },
      userId
    );

    const result = await upsertAdSetFromGraph(payload, connection.adAccountId);
    
    logger.info('Ad set synced from webhook', {
      tenantId: connection.tenantId,
      adSetId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to sync ad set from webhook', {
      tenantId: connection.tenantId,
      adSetId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function syncAdFromWebhook(connection: IMetaConnection, adId: string) {
  try {
    const { accessToken } = await ensureConnectionAccessToken(connection);
    const userId = connection.tenantId;
    const payload = await fetchGraphNode<GraphAd>(
      accessToken,
      `${adId}`,
      { fields: adFields.join(',') },
      userId
    );

    const result = await upsertAdFromGraph(payload, connection.adAccountId);
    
    logger.info('Ad synced from webhook', {
      tenantId: connection.tenantId,
      adId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to sync ad from webhook', {
      tenantId: connection.tenantId,
      adId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Sync performance data for a single campaign
 */
export async function syncPerformanceDataForCampaign(
  connection: IMetaConnection,
  campaignId: string,
  datePreset: string = 'yesterday'
) {
  try {
    const { accessToken } = await ensureConnectionAccessToken(connection);
    const userId = connection.tenantId;

    const insightsFields = [
      'impressions',
      'clicks',
      'spend',
      'actions',
      'action_values',
      'date_start',
      'date_stop',
    ];

    const insights = await fetchInsights<any>(
      accessToken,
      campaignId,
      {
        fields: insightsFields.join(','),
        date_preset: datePreset,
        time_increment: '1',
      },
      userId
    );

    if (!insights || insights.length === 0) {
      logger.warn('No insights data for campaign', { campaignId, datePreset });
      return null;
    }

    // Use the most recent insight
    const insight = insights[0];
    return await upsertPerformanceSnapshot(
      'CAMPAIGN',
      campaignId,
      insight
    );
  } catch (error) {
    logger.error('Failed to sync performance data for campaign', {
      campaignId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Sync performance data for a single ad set
 */
export async function syncPerformanceDataForAdSet(
  connection: IMetaConnection,
  adSetId: string,
  datePreset: string = 'yesterday'
) {
  try {
    const { accessToken } = await ensureConnectionAccessToken(connection);
    const userId = connection.tenantId;

    const insightsFields = [
      'impressions',
      'clicks',
      'spend',
      'actions',
      'action_values',
      'date_start',
      'date_stop',
    ];

    const insights = await fetchInsights<any>(
      accessToken,
      adSetId,
      {
        fields: insightsFields.join(','),
        date_preset: datePreset,
        time_increment: '1',
      },
      userId
    );

    if (!insights || insights.length === 0) {
      logger.warn('No insights data for ad set', { adSetId, datePreset });
      return null;
    }

    const insight = insights[0];
    return await upsertPerformanceSnapshot(
      'AD_SET',
      adSetId,
      insight
    );
  } catch (error) {
    logger.error('Failed to sync performance data for ad set', {
      adSetId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Sync performance data for a single ad
 */
export async function syncPerformanceDataForAd(
  connection: IMetaConnection,
  adId: string,
  datePreset: string = 'yesterday'
) {
  try {
    const { accessToken } = await ensureConnectionAccessToken(connection);
    const userId = connection.tenantId;

    const insightsFields = [
      'impressions',
      'clicks',
      'spend',
      'actions',
      'action_values',
      'date_start',
      'date_stop',
    ];

    const insights = await fetchInsights<any>(
      accessToken,
      adId,
      {
        fields: insightsFields.join(','),
        date_preset: datePreset,
        time_increment: '1',
      },
      userId
    );

    if (!insights || insights.length === 0) {
      logger.warn('No insights data for ad', { adId, datePreset });
      return null;
    }

    const insight = insights[0];
    return await upsertPerformanceSnapshot(
      'AD',
      adId,
      insight
    );
  } catch (error) {
    logger.error('Failed to sync performance data for ad', {
      adId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
