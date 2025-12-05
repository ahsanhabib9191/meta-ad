"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
const client_1 = require("./client");
const campaign_1 = require("./models/campaign");
const optimization_log_1 = require("./models/optimization-log");
const Tenant_1 = require("./models/Tenant");
const MetaConnection_1 = require("./models/MetaConnection");
const WebsiteAudit_1 = require("./models/WebsiteAudit");
const GeneratedCopy_1 = require("./models/GeneratedCopy");
const ad_set_1 = require("./models/ad-set");
const ad_1 = require("./models/ad");
// Static array of models for faster initialization (avoids dynamic import overhead)
const models = [
    campaign_1.CampaignModel,
    optimization_log_1.OptimizationLogModel,
    Tenant_1.TenantModel,
    MetaConnection_1.MetaConnectionModel,
    WebsiteAudit_1.WebsiteAuditModel,
    GeneratedCopy_1.GeneratedCopyModel,
    ad_set_1.AdSetModel,
    ad_1.AdModel,
];
async function initializeDatabase() {
    await (0, client_1.connectDB)();
    // Drop existing indexes to avoid duplicate/auto-named conflicts, then sync declared indexes.
    for (const m of models) {
        try {
            await m.collection.dropIndexes();
        }
        catch (err) {
            // Ignore if no indexes exist yet
            if (err?.codeName !== 'NamespaceNotFound' && err?.code !== 26) {
                console.warn(`Index drop warning for ${m.modelName}:`, err?.message || err);
            }
        }
        await m.syncIndexes();
    }
    console.log('✅ Database initialized with all required models and indexes');
}
