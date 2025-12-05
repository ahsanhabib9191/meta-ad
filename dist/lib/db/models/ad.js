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
exports.AdModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AdIssueSchema = new mongoose_1.Schema({
    errorCode: { type: String },
    errorMessage: { type: String, required: true },
    errorSummary: { type: String },
    level: { type: String, required: true },
}, { _id: false });
const AdCreativeSchema = new mongoose_1.Schema({
    creativeId: { type: String },
    type: { type: String },
    headline: { type: String },
    body: { type: String },
    callToAction: { type: String },
    linkUrl: { type: String },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
}, { _id: false });
const AdSchema = new mongoose_1.Schema({
    adId: { type: String, required: true },
    adSetId: { type: String, required: true },
    campaignId: { type: String, required: true },
    accountId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, required: true },
    creative: { type: AdCreativeSchema, required: true },
    effectiveStatus: { type: String, required: true },
    issues: { type: [AdIssueSchema], default: [] },
}, { timestamps: true });
// Indexes
AdSchema.index({ adId: 1 }, { unique: true });
AdSchema.index({ adSetId: 1, status: 1 });
AdSchema.index({ campaignId: 1, status: 1 });
AdSchema.index({ accountId: 1, status: 1 });
AdSchema.index({ effectiveStatus: 1 });
AdSchema.index({ 'creative.creativeId': 1 });
exports.AdModel = mongoose_1.default.models.Ad || mongoose_1.default.model('Ad', AdSchema);
exports.default = exports.AdModel;
