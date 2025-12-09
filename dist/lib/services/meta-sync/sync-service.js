"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertCampaignFromGraph = upsertCampaignFromGraph;
exports.upsertAdSetFromGraph = upsertAdSetFromGraph;
exports.upsertAdFromGraph = upsertAdFromGraph;
exports.syncMetaConnection = syncMetaConnection;
exports.syncCampaignFromWebhook = syncCampaignFromWebhook;
exports.syncAdSetFromWebhook = syncAdSetFromWebhook;
exports.syncAdFromWebhook = syncAdFromWebhook;
const ad_1 = require("../../db/models/ad");
const ad_set_1 = require("../../db/models/ad-set");
const campaign_1 = require("../../db/models/campaign");
const MetaConnection_1 = require("../../db/models/MetaConnection");
const logger_1 = __importDefault(require("../../utils/logger"));
const batch_operations_1 = require("../../utils/batch-operations");
const graph_client_1 = require("./graph-client");
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
const campaignStatusMap = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    ARCHIVED: 'ARCHIVED',
    DRAFT: 'DRAFT',
    LEARNING: 'LEARNING',
    LEARNING_LIMITED: 'LEARNING_LIMITED',
};
const adSetStatusMap = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    ARCHIVED: 'ARCHIVED',
};
const adStatusMap = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    ARCHIVED: 'ARCHIVED',
    DRAFT: 'DRAFT',
};
const adEffectiveStatusMap = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    DISAPPROVED: 'DISAPPROVED',
    PENDING_REVIEW: 'PENDING_REVIEW',
    ARCHIVED: 'ARCHIVED',
    DELETED: 'DELETED',
    ADSET_PAUSED: 'ADSET_PAUSED',
    CAMPAIGN_PAUSED: 'CAMPAIGN_PAUSED',
};
function normalizeCampaignStatus(status) {
    if (!status)
        return 'DRAFT';
    return campaignStatusMap[status] || 'DRAFT';
}
function normalizeAdSetStatus(status) {
    if (!status)
        return 'DRAFT';
    return adSetStatusMap[status] || 'DRAFT';
}
function normalizeLearningPhase(status) {
    if (!status)
        return 'NOT_STARTED';
    const upper = status.toUpperCase();
    if (upper.includes('LEARNING'))
        return 'LEARNING';
    if (upper.includes('ACTIVE'))
        return 'ACTIVE';
    return 'NOT_STARTED';
}
function normalizeAdStatus(status) {
    if (!status)
        return 'DRAFT';
    return adStatusMap[status] || 'DRAFT';
}
function normalizeAdEffectiveStatus(status) {
    if (!status)
        return 'PAUSED';
    return adEffectiveStatusMap[status] || 'PAUSED';
}
function mapTargeting(targeting) {
    if (!targeting) {
        return {};
    }
    const countries = targeting.geo_locations?.countries?.map((c) => c.key) ?? targeting.geo_locations?.countries;
    const locations = [];
    if (countries) {
        locations.push(...countries.filter(Boolean));
    }
    return {
        audienceSize: targeting.app_store_audience_size,
        ageMin: targeting.age_min,
        ageMax: targeting.age_max,
        genders: targeting.genders,
        locations,
        interests: targeting.interests?.map((interest) => interest.name),
        customAudiences: targeting.custom_audiences,
        lookalikes: targeting.lookalike_specs?.map((lookalike) => lookalike.name),
        exclusions: targeting.excluded_custom_audiences,
    };
}
function mapCreative(creative) {
    if (!creative) {
        return {};
    }
    return {
        creativeId: creative.id,
        type: creative.asset_feed_spec?.attachment_style || creative.object_story_spec?.link_data?.link, // best effort
        headline: creative.title || creative.headline || creative.name,
        body: creative.body || creative.message,
        callToAction: creative.object_story_spec?.link_data?.call_to_action?.type || creative.call_to_action?.type,
        linkUrl: creative.link_url || creative.object_story_spec?.link_data?.link,
        metadata: creative,
    };
}
async function upsertCampaignFromGraph(payload, accountId) {
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
    // Use lean() for better performance when we don't need full Mongoose document
    return campaign_1.CampaignModel.findOneAndUpdate({ campaignId: payload.id }, mapped, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        lean: true,
    }).exec();
}
async function upsertAdSetFromGraph(payload, accountId) {
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
    // Use lean() for better performance when we don't need full Mongoose document
    return ad_set_1.AdSetModel.findOneAndUpdate({ adSetId: payload.id }, mapped, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        lean: true,
    }).exec();
}
async function upsertAdFromGraph(payload, accountId) {
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
    // Use lean() for better performance when we don't need full Mongoose document
    return ad_1.AdModel.findOneAndUpdate({ adId: payload.id }, mapped, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        lean: true,
    }).exec();
}
function mapIssues(effectiveStatus) {
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
async function syncMetaConnection(connection) {
    const { connection: safeConnection, accessToken } = await (0, graph_client_1.ensureConnectionAccessToken)(connection);
    const accountId = safeConnection.adAccountId;
    // Fetch campaigns, adsets, and ads in parallel for better performance
    const [campaigns, adSets, ads] = await Promise.all([
        (0, graph_client_1.fetchGraphEdges)(accessToken, `${accountId}/campaigns`, (0, graph_client_1.buildGraphEdgeParams)(campaignFields)),
        (0, graph_client_1.fetchGraphEdges)(accessToken, `${accountId}/adsets`, (0, graph_client_1.buildGraphEdgeParams)(adSetFields)),
        (0, graph_client_1.fetchGraphEdges)(accessToken, `${accountId}/ads`, (0, graph_client_1.buildGraphEdgeParams)(adFields)),
    ]);
    // Use batch operations for large syncs (more than 50 items)
    if (campaigns.length > 50 || adSets.length > 50 || ads.length > 50) {
        const [campaignResult, adSetResult, adResult] = await Promise.all([
            (0, batch_operations_1.batchUpsert)(campaign_1.CampaignModel, campaigns.map((payload) => ({
                filter: { campaignId: payload.id },
                update: {
                    campaignId: payload.id,
                    accountId,
                    name: payload.name,
                    objective: payload.objective ?? 'OUTCOME_TRAFFIC',
                    status: normalizeCampaignStatus(payload.status),
                    budget: payload.daily_budget ? Number(payload.daily_budget) : 0,
                    startDate: payload.start_time ? new Date(payload.start_time) : undefined,
                    endDate: payload.stop_time ? new Date(payload.stop_time) : undefined,
                },
            }))),
            (0, batch_operations_1.batchUpsert)(ad_set_1.AdSetModel, adSets.map((payload) => ({
                filter: { adSetId: payload.id },
                update: {
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
                },
            }))),
            (0, batch_operations_1.batchUpsert)(ad_1.AdModel, ads.map((payload) => ({
                filter: { adId: payload.id },
                update: {
                    adId: payload.id,
                    adSetId: payload.adset_id || '',
                    campaignId: '',
                    accountId,
                    name: payload.name,
                    status: normalizeAdStatus(payload.status),
                    creative: mapCreative(payload.creative),
                    effectiveStatus: normalizeAdEffectiveStatus(payload.effective_status),
                    issues: mapIssues(payload.effective_status),
                },
            }))),
        ]);
        logger_1.default.info('Meta connection synced with batch operations', {
            tenantId: safeConnection.tenantId,
            adAccountId: accountId,
            campaignsProcessed: campaignResult.successful,
            adSetsProcessed: adSetResult.successful,
            adsProcessed: adResult.successful,
            errors: campaignResult.errors.length + adSetResult.errors.length + adResult.errors.length,
        });
    }
    else {
        // For small syncs, use individual upserts (already optimized with lean)
        await Promise.all([
            ...campaigns.map((payload) => upsertCampaignFromGraph(payload, accountId)),
            ...adSets.map((payload) => upsertAdSetFromGraph(payload, accountId)),
            ...ads.map((payload) => upsertAdFromGraph(payload, accountId)),
        ]);
        logger_1.default.info('Meta connection synced', {
            tenantId: safeConnection.tenantId,
            adAccountId: accountId,
            campaignCount: campaigns.length,
            adSetCount: adSets.length,
            adCount: ads.length,
        });
    }
    await MetaConnection_1.MetaConnectionModel.findByIdAndUpdate(safeConnection._id, { lastSyncedAt: new Date() }).exec();
    return {
        campaignsSynced: campaigns.length,
        adSetsSynced: adSets.length,
        adsSynced: ads.length,
    };
}
async function syncCampaignFromWebhook(connection, campaignId) {
    const { accessToken } = await (0, graph_client_1.ensureConnectionAccessToken)(connection);
    const payload = await (0, graph_client_1.fetchGraphNode)(accessToken, `${campaignId}`, { fields: campaignFields.join(',') });
    return upsertCampaignFromGraph(payload, connection.adAccountId);
}
async function syncAdSetFromWebhook(connection, adSetId) {
    const { accessToken } = await (0, graph_client_1.ensureConnectionAccessToken)(connection);
    const payload = await (0, graph_client_1.fetchGraphNode)(accessToken, `${adSetId}`, { fields: adSetFields.join(',') });
    return upsertAdSetFromGraph(payload, connection.adAccountId);
}
async function syncAdFromWebhook(connection, adId) {
    const { accessToken } = await (0, graph_client_1.ensureConnectionAccessToken)(connection);
    const payload = await (0, graph_client_1.fetchGraphNode)(accessToken, `${adId}`, { fields: adFields.join(',') });
    return upsertAdFromGraph(payload, connection.adAccountId);
}
