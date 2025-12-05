"use strict";
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
    const mc = await MetaConnection_1.MetaConnectionModel.create({ tenantId, adAccountId: 'act_123', accessToken: plainAccess, refreshToken: plainRefresh });
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
    await MetaConnection_1.MetaConnectionModel.updateOne({ _id: mc._id }, { accessToken: newAccess });
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
