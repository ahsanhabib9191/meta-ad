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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("../lib/db/client");
const MetaConnection_1 = require("../lib/db/models/MetaConnection");
const Tenant_1 = require("../lib/db/models/Tenant");
const crypto_1 = require("../lib/utils/crypto");
dotenv_1.default.config();
async function run() {
    await (0, client_1.connectDB)();
    // Setup: create a tenant
    const tenantId = 'tenant-test-' + Math.random().toString(36).slice(2);
    const tenant = await Tenant_1.TenantModel.create({ tenantId, name: 'Test Tenant', plan: 'FREE' });
    // Test MetaConnection encryption
    const plainAccess = 'access-token-plain-' + Math.random().toString(36).slice(2);
    const plainRefresh = 'refresh-token-plain-' + Math.random().toString(36).slice(2);
    const mc = await MetaConnection_1.MetaConnectionModel.create({ tenantId, adAccountId: 'act_123', accessToken: plainAccess, refreshToken: plainRefresh, status: 'ACTIVE' });
    // Reload raw to inspect storage
    const stored = await MetaConnection_1.MetaConnectionModel.findById(mc._id).lean();
    if (!stored)
        throw new Error('Stored MetaConnection not found');
    // Ensure ciphertext differs from plaintext
    if (stored.accessToken === plainAccess)
        throw new Error('accessToken was not encrypted at rest');
    if (stored.refreshToken === plainRefresh)
        throw new Error('refreshToken was not encrypted at rest');
    // Use instance helpers to get decrypted values
    const mcLoaded = await MetaConnection_1.MetaConnectionModel.findById(mc._id);
    if (!mcLoaded)
        throw new Error('MetaConnection doc missing');
    const decA = (0, crypto_1.decrypt)(mcLoaded.accessToken);
    const decR = mcLoaded.refreshToken ? (0, crypto_1.decrypt)(mcLoaded.refreshToken) : undefined;
    if (decA !== plainAccess)
        throw new Error('Decrypted accessToken mismatch');
    if (decR !== plainRefresh)
        throw new Error('Decrypted refreshToken mismatch');
    // Test updating tokens also encrypts
    const newAccess = 'new-access-token-' + Math.random().toString(36).slice(2);
    // Use class helper to ensure encryption on update
    const updated = await (await Promise.resolve().then(() => __importStar(require('../lib/db/models/MetaConnection')))).MetaConnection.updateTokens(tenantId, 'act_123', { accessToken: newAccess });
    const afterUpdate = await MetaConnection_1.MetaConnectionModel.findById(mc._id).lean();
    if (!afterUpdate)
        throw new Error('After-update doc missing');
    if (afterUpdate.accessToken === newAccess)
        throw new Error('Updated accessToken was not encrypted');
    // Tenant API key issue/verify
    const apiKey = await Tenant_2.Tenant.issueApiKey(tenantId);
    const ok = await Tenant_2.Tenant.verifyApiKey(tenantId, apiKey);
    if (!ok)
        throw new Error('API key verification failed');
    // Increment counters
    await Tenant_2.Tenant.incrementRequestCounts(tenantId, 2, 3);
    const t2 = await Tenant_1.TenantModel.findOne({ tenantId }).lean();
    if (!t2?.requestCounts || t2.requestCounts.daily < 2 || t2.requestCounts.monthly < 3) {
        throw new Error('Request counters did not increment as expected');
    }
    console.log('Encryption and Tenant API key tests passed');
    await (0, client_1.disconnectDB)();
}
// Minimal static Tenant wrapper import workaround
const Tenant_2 = require("../lib/db/models/Tenant");
run().catch(async (err) => {
    console.error(err);
    try {
        await (0, client_1.disconnectDB)();
    }
    catch { }
    process.exit(1);
});
