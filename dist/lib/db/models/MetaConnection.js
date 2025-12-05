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
exports.MetaConnection = exports.MetaConnectionModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const crypto_1 = require("../../utils/crypto");
const MetaConnectionSchema = new mongoose_1.Schema({
    tenantId: { type: String, required: true },
    adAccountId: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date },
    permissions: { type: [String], default: [] },
    status: { type: String, required: true },
    lastSyncedAt: { type: Date },
}, { timestamps: true });
// Encrypt tokens before save
MetaConnectionSchema.pre('save', function (next) {
    const doc = this;
    if (doc.isModified('accessToken')) {
        doc.accessToken = (0, crypto_1.encrypt)(doc.accessToken);
    }
    if (doc.isModified('refreshToken') && doc.refreshToken) {
        doc.refreshToken = (0, crypto_1.encrypt)(doc.refreshToken);
    }
    next();
});
// Helper methods to get decrypted tokens
MetaConnectionSchema.methods.getAccessToken = function () {
    return (0, crypto_1.decrypt)(this.accessToken);
};
MetaConnectionSchema.methods.getRefreshToken = function () {
    return this.refreshToken ? (0, crypto_1.decrypt)(this.refreshToken) : undefined;
};
// Indexes
MetaConnectionSchema.index({ tenantId: 1, adAccountId: 1 }, { unique: true });
MetaConnectionSchema.index({ status: 1 });
MetaConnectionSchema.index({ tokenExpiresAt: 1 }, { sparse: true });
exports.MetaConnectionModel = mongoose_1.default.models.MetaConnection || mongoose_1.default.model('MetaConnection', MetaConnectionSchema);
class MetaConnection {
    static async create(data) {
        return exports.MetaConnectionModel.create(data);
    }
    static async findByTenantAndAccount(tenantId, adAccountId) {
        return exports.MetaConnectionModel.findOne({ tenantId, adAccountId }).exec();
    }
    static async updateTokens(tenantId, adAccountId, update) {
        const toUpdate = { ...update };
        if (toUpdate.accessToken)
            toUpdate.accessToken = (0, crypto_1.encrypt)(toUpdate.accessToken);
        if (toUpdate.refreshToken)
            toUpdate.refreshToken = (0, crypto_1.encrypt)(toUpdate.refreshToken);
        return exports.MetaConnectionModel.findOneAndUpdate({ tenantId, adAccountId }, toUpdate, { new: true }).exec();
    }
    static async revoke(tenantId, adAccountId) {
        return exports.MetaConnectionModel.findOneAndUpdate({ tenantId, adAccountId }, { status: 'REVOKED' }, { new: true }).exec();
    }
}
exports.MetaConnection = MetaConnection;
exports.default = exports.MetaConnectionModel;
