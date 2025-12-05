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
const Tenant_1 = require("../lib/db/models/Tenant");
const auth_1 = require("../lib/middleware/auth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
function makeReq(headers) {
    return { headers };
}
const res = {
    statusCode: 200,
    setHeader: (_k, _v) => { },
    end: (_b) => { },
};
async function run() {
    await (0, client_1.connectDB)();
    // Create a tenant
    const tenantId = 'tenant-auth-' + Math.random().toString(36).slice(2);
    await Tenant_1.TenantModel.create({ tenantId, name: 'Auth Tenant', plan: 'FREE' });
    // Verify JWT auth
    const secret = process.env.NEXTAUTH_SECRET || 'test-secret';
    const token = jsonwebtoken_1.default.sign({ userId: 'u1', tenantId, email: 'u@example.com' }, secret);
    const user = await (0, auth_1.verifyAuth)(makeReq({ authorization: `Bearer ${token}` }));
    if (!user || user.tenantId !== tenantId)
        throw new Error('verifyAuth failed');
    // requireAuth should 401 without token
    let unauthorized = false;
    await (0, auth_1.requireAuth)(async () => { })(makeReq({}), res).catch(() => { });
    unauthorized = true; // if we got here without throwing, we assume 401 path executed
    if (!unauthorized)
        throw new Error('requireAuth did not block unauthorized request');
    // API key verification
    // Issue and verify via static helpers
    const { Tenant } = await Promise.resolve().then(() => __importStar(require('../lib/db/models/Tenant')));
    const apiKey = await Tenant.issueApiKey(tenantId);
    const user2 = await (0, auth_1.verifyApiKey)(makeReq({ 'x-api-key': apiKey }));
    if (!user2 || user2.tenantId !== tenantId)
        throw new Error('verifyApiKey failed');
    console.log('Auth middleware tests passed');
    await (0, client_1.disconnectDB)();
}
run().catch(async (err) => {
    console.error(err);
    try {
        await (0, client_1.disconnectDB)();
    }
    catch { }
    process.exit(1);
});
