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
exports.AudienceInsightModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AudienceInsightSchema = new mongoose_1.Schema({
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    dimension: { type: String, required: true },
    value: { type: String, required: true },
    date: { type: Date, required: true },
    impressions: { type: Number, required: true, min: 0 },
    clicks: { type: Number, required: true, min: 0 },
    conversions: { type: Number, required: true, min: 0 },
    spend: { type: Number, required: true, min: 0 },
    revenue: { type: Number, min: 0 },
}, { timestamps: true });
// Explicit indexes
AudienceInsightSchema.index({ entityType: 1, entityId: 1, dimension: 1, value: 1, date: 1 }, { unique: true });
AudienceInsightSchema.index({ date: 1 });
exports.AudienceInsightModel = mongoose_1.default.models.AudienceInsight ||
    mongoose_1.default.model('AudienceInsight', AudienceInsightSchema);
exports.default = exports.AudienceInsightModel;
