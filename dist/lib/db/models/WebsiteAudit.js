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
exports.WebsiteAudit = exports.WebsiteAuditModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AuditIssueSchema = new mongoose_1.Schema({
    code: { type: String, required: true },
    severity: { type: String, required: true },
    message: { type: String, required: true },
    path: { type: String },
}, { _id: false });
const WebsiteAuditSchema = new mongoose_1.Schema({
    tenantId: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: String, required: true },
    issues: { type: [AuditIssueSchema], default: [] },
    metrics: { type: mongoose_1.Schema.Types.Mixed },
    lastRunAt: { type: Date },
}, { timestamps: true });
// Indexes
WebsiteAuditSchema.index({ tenantId: 1, url: 1 }, { unique: true });
WebsiteAuditSchema.index({ status: 1 });
WebsiteAuditSchema.index({ lastRunAt: 1 }, { sparse: true });
exports.WebsiteAuditModel = mongoose_1.default.models.WebsiteAudit || mongoose_1.default.model('WebsiteAudit', WebsiteAuditSchema);
class WebsiteAudit {
    static async create(data) {
        return exports.WebsiteAuditModel.create(data);
    }
    static async findByTenantAndUrl(tenantId, url) {
        return exports.WebsiteAuditModel.findOne({ tenantId, url }).exec();
    }
    static async updateStatus(tenantId, url, status) {
        return exports.WebsiteAuditModel.findOneAndUpdate({ tenantId, url }, { status }, { new: true }).exec();
    }
}
exports.WebsiteAudit = WebsiteAudit;
exports.default = exports.WebsiteAuditModel;
