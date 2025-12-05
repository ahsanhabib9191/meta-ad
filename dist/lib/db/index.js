"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
const client_1 = require("./client");
async function initializeDatabase() {
    await (0, client_1.connectDB)();
    const models = [
        (await Promise.resolve().then(() => __importStar(require('./models/campaign')))).CampaignModel,
        (await Promise.resolve().then(() => __importStar(require('./models/optimization-log')))).OptimizationLogModel,
        (await Promise.resolve().then(() => __importStar(require('./models/Tenant')))).TenantModel,
        (await Promise.resolve().then(() => __importStar(require('./models/MetaConnection')))).MetaConnectionModel,
        (await Promise.resolve().then(() => __importStar(require('./models/WebsiteAudit')))).WebsiteAuditModel,
        (await Promise.resolve().then(() => __importStar(require('./models/GeneratedCopy')))).GeneratedCopyModel,
        (await Promise.resolve().then(() => __importStar(require('./models/ad-set')))).AdSetModel,
        (await Promise.resolve().then(() => __importStar(require('./models/ad')))).AdModel,
    ];
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
