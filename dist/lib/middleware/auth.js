"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuth = verifyAuth;
exports.requireAuth = requireAuth;
exports.verifyApiKey = verifyApiKey;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Tenant_1 = require("../db/models/Tenant");
const crypto_1 = require("../utils/crypto");
function getTokenFromHeaders(req) {
    const auth = (req.headers['authorization'] || '');
    if (auth && auth.startsWith('Bearer '))
        return auth.substring(7);
    return null;
}
async function verifyAuth(req) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret)
        return null;
    const token = getTokenFromHeaders(req);
    if (!token)
        return null;
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        if (!payload?.userId || !payload?.tenantId || !payload?.email)
            return null;
        // Only select the plan field for efficiency
        const tenant = await Tenant_1.TenantModel.findOne({ tenantId: payload.tenantId }).select('plan').lean();
        if (!tenant)
            return null;
        return { userId: payload.userId, tenantId: payload.tenantId, email: payload.email, plan: tenant.plan };
    }
    catch {
        return null;
    }
}
function requireAuth(handler) {
    return async (req, res) => {
        const user = await verifyAuth(req);
        if (!user) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' }));
            return;
        }
        req.user = user;
        return handler(req, res);
    };
}
async function verifyApiKey(req) {
    const apiKey = (req.headers['x-api-key'] || '');
    if (!apiKey)
        return null;
    const hash = (0, crypto_1.hashApiKey)(apiKey);
    // Only select the required fields for efficiency
    const tenant = await Tenant_1.TenantModel.findOne({ apiKeyHash: hash }).select('tenantId plan').lean();
    if (!tenant)
        return null;
    return { userId: tenant.tenantId, tenantId: tenant.tenantId, email: '', plan: tenant.plan };
}
