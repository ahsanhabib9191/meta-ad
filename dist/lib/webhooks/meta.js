"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMetaWebhookChallenge = resolveMetaWebhookChallenge;
exports.verifyMetaWebhookSignature = verifyMetaWebhookSignature;
exports.handleMetaWebhook = handleMetaWebhook;
const crypto_1 = __importDefault(require("crypto"));
const MetaConnection_1 = require("../db/models/MetaConnection");
const sync_service_1 = require("../services/meta-sync/sync-service");
const logger_1 = __importDefault(require("../utils/logger"));
const APP_SECRET = process.env.META_APP_SECRET;
const VERIFY_TOKEN = process.env.META_APP_VERIFY_TOKEN;
function resolveMetaWebhookChallenge(query) {
    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === VERIFY_TOKEN) {
        return query['hub.challenge'] || null;
    }
    return null;
}
function verifyMetaWebhookSignature(signature, rawBody) {
    if (!APP_SECRET || !signature) {
        return false;
    }
    const [algorithm, hash] = signature.split('=');
    if (algorithm !== 'sha1' || !hash) {
        return false;
    }
    const expected = crypto_1.default.createHmac('sha1', APP_SECRET).update(rawBody).digest('hex');
    return hash === expected;
}
async function handleMetaWebhook(body) {
    if (!body.entry || body.entry.length === 0) {
        logger_1.default.warn('Meta webhook received without entry data');
        return;
    }
    // Process all entries in parallel using Promise.allSettled to prevent one failure from canceling others
    const entryResults = await Promise.allSettled(body.entry.map(async (entry) => {
        if (!entry.id || !entry.changes) {
            return;
        }
        // Fetch connection (not using lean here to preserve model methods)
        const connection = await MetaConnection_1.MetaConnectionModel.findOne({ adAccountId: entry.id })
            .select('tenantId adAccountId accessToken refreshToken tokenExpiresAt status')
            .exec();
        if (!connection) {
            logger_1.default.warn('Meta webhook received for unknown ad account', { adAccountId: entry.id });
            return;
        }
        // Process all changes for this entry in parallel with individual error handling
        const changeResults = await Promise.allSettled(entry.changes.map(async (change) => {
            if (change.field === 'campaign' && change.value?.id) {
                await (0, sync_service_1.syncCampaignFromWebhook)(connection, change.value.id);
            }
            else if (change.field === 'adset' && change.value?.id) {
                await (0, sync_service_1.syncAdSetFromWebhook)(connection, change.value.id);
            }
            else if (change.field === 'ad' && change.value?.id) {
                await (0, sync_service_1.syncAdFromWebhook)(connection, change.value.id);
            }
        }));
        // Log any failed changes
        changeResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                const change = entry.changes[index];
                logger_1.default.error('Failed to process Meta webhook change', {
                    adAccountId: entry.id,
                    change: change?.field,
                    error: result.reason,
                });
            }
        });
    }));
    // Log any failed entries
    entryResults.forEach((result, index) => {
        if (result.status === 'rejected') {
            logger_1.default.error('Failed to process Meta webhook entry', {
                entryIndex: index,
                error: result.reason,
            });
        }
    });
}
