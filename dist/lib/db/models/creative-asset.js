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
exports.CreativeAssetModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CreativeUsageRefSchema = new mongoose_1.Schema({
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
}, { _id: false });
const CreativeAssetSchema = new mongoose_1.Schema({
    assetId: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true },
    hash: { type: String },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
    usedBy: { type: [CreativeUsageRefSchema], default: [] },
}, { timestamps: true });
// Explicit indexes (removed redundant inline index: true definitions)
CreativeAssetSchema.index({ assetId: 1 }, { unique: true });
CreativeAssetSchema.index({ type: 1 });
CreativeAssetSchema.index({ hash: 1 }, { unique: true, sparse: true });
CreativeAssetSchema.index({ 'usedBy.entityType': 1, 'usedBy.entityId': 1 });
exports.CreativeAssetModel = mongoose_1.default.models.CreativeAsset ||
    mongoose_1.default.model('CreativeAsset', CreativeAssetSchema);
exports.default = exports.CreativeAssetModel;
