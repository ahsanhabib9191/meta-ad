import { AdModel } from '../../db/models/ad';
import { AdSetModel, ITargeting } from '../../db/models/ad-set';
import { CampaignModel } from '../../db/models/campaign';
import {
  IMetaConnection,
  MetaConnectionModel,
} from '../../db/models/MetaConnection';
import logger from '../../utils/logger';
import {
  buildGraphEdgeParams,
  ensureConnectionAccessToken,
  fetchGraphEdges,
  fetchGraphNode,
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

export async function upsertAdFromGraph(payload: GraphAd, accountId: string) {
  const mapped = {
    adId: payload.id,
    adSetId: payload.adset_id || '',
    campaignId: '',
    accountId,
    name: payload.name,
    status: normalizeAdStatus(payload.status),
    creative: mapCreative(payload.creative),
    effectiveStatus: normalizeAdEffectiveStatus(payload.effective_status),
    issues: mapIssues(payload.effective_status),
  };

  return AdModel.findOneAndUpdate({ adId: payload.id }, mapped, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).exec();
}

function mapIssues(effectiveStatus?: string) {
  if (!effectiveStatus) {
    return [];
  }

  if (effectiveStatus.toUpperCase() === 'DISAPPROVED') {
    return [
      {
        errorCode: 'DISAPPROVED',
        errorMessage: 'Ad disapproved by Meta',
        level: 'ERROR',
      },
    ];
  }

  return [];
}

export async function syncMetaConnection(connection: IMetaConnection) {
  const { connection: safeConnection, accessToken } = await ensureConnectionAccessToken(connection);
  const accountId = safeConnection.adAccountId;

  // Fetch campaigns, adsets, and ads in parallel for better performance
  const [campaigns, adSets, ads] = await Promise.all([
    fetchGraphEdges<GraphCampaign>(
      accessToken,
      `${accountId}/campaigns`,
      buildGraphEdgeParams(campaignFields)
    ),
    fetchGraphEdges<GraphAdSet>(
      accessToken,
      `${accountId}/adsets`,
      buildGraphEdgeParams(adSetFields)
    ),
    fetchGraphEdges<GraphAd>(
      accessToken,
      `${accountId}/ads`,
      buildGraphEdgeParams(adFields)
    ),
  ]);

  // Upsert all entities in parallel
  await Promise.all([
    ...campaigns.map((payload) => upsertCampaignFromGraph(payload, accountId)),
    ...adSets.map((payload) => upsertAdSetFromGraph(payload, accountId)),
    ...ads.map((payload) => upsertAdFromGraph(payload, accountId)),
  ]);

  await MetaConnectionModel.findByIdAndUpdate(safeConnection._id, { lastSyncedAt: new Date() }).exec();

  logger.info('Meta connection synced', {
    tenantId: safeConnection.tenantId,
    adAccountId: accountId,
    campaignCount: campaigns.length,
    adSetCount: adSets.length,
    adCount: ads.length,
  });

  return {
    campaignsSynced: campaigns.length,
    adSetsSynced: adSets.length,
    adsSynced: ads.length,
  };
}

export async function syncCampaignFromWebhook(connection: IMetaConnection, campaignId: string) {
  const { accessToken } = await ensureConnectionAccessToken(connection);
  const payload = await fetchGraphNode<GraphCampaign>(
    accessToken,
    `${campaignId}`,
    { fields: campaignFields.join(',') }
  );

  return upsertCampaignFromGraph(payload, connection.adAccountId);
}

export async function syncAdSetFromWebhook(connection: IMetaConnection, adSetId: string) {
  const { accessToken } = await ensureConnectionAccessToken(connection);
  const payload = await fetchGraphNode<GraphAdSet>(
    accessToken,
    `${adSetId}`,
    { fields: adSetFields.join(',') }
  );

  return upsertAdSetFromGraph(payload, connection.adAccountId);
}

export async function syncAdFromWebhook(connection: IMetaConnection, adId: string) {
  const { accessToken } = await ensureConnectionAccessToken(connection);
  const payload = await fetchGraphNode<GraphAd>(accessToken, `${adId}`, { fields: adFields.join(',') });

  return upsertAdFromGraph(payload, connection.adAccountId);
}
