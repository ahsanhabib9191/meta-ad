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
exports.AdSetModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AD_SET_STATUS_VALUES = ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'];
const LEARNING_PHASE_STATUS_VALUES = ['LEARNING', 'ACTIVE', 'LEARNING_LIMITED', 'NOT_STARTED'];
const TargetingSchema = new mongoose_1.Schema({
    audienceSize: { type: Number, min: 0 },
    ageMin: { type: Number },
    ageMax: { type: Number },
    genders: { type: [Number] },
    locations: { type: [String] },
    interests: { type: [String] },
    customAudiences: { type: [String] },
    lookalikes: { type: [String] },
    exclusions: { type: mongoose_1.Schema.Types.Mixed },
}, { _id: false });
const AdSetSchema = new mongoose_1.Schema({
    adSetId: { type: String, required: true },
    campaignId: { type: String, required: true },
    accountId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, required: true, enum: AD_SET_STATUS_VALUES },
    budget: { type: Number, required: true, min: 0 },
    targeting: { type: TargetingSchema, default: {} },
    learningPhaseStatus: { type: String, required: true, enum: LEARNING_PHASE_STATUS_VALUES },
    optimizationGoal: { type: String, required: true },
    deliveryStatus: { type: String },
    optimizationEventsCount: { type: Number, min: 0 },
    ageDays: { type: Number, min: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
}, { timestamps: true });
// Indexes
AdSetSchema.index({ adSetId: 1 }, { unique: true });
AdSetSchema.index({ campaignId: 1, status: 1 });
AdSetSchema.index({ accountId: 1, status: 1 });
AdSetSchema.index({ status: 1 });
AdSetSchema.index({ learningPhaseStatus: 1 });
AdSetSchema.index({ status: 1, learningPhaseStatus: 1 });
exports.AdSetModel = mongoose_1.default.models.AdSet || mongoose_1.default.model('AdSet', AdSetSchema);
exports.default = exports.AdSetModel;
