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
exports.GeneratedCopy = exports.GeneratedCopyModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UsedByRefSchema = new mongoose_1.Schema({
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
}, { _id: false });
const GeneratedCopySchema = new mongoose_1.Schema({
    tenantId: { type: String, required: true },
    context: { type: String, required: true },
    inputBrief: { type: String, required: true },
    outputText: { type: String, required: true },
    model: { type: String },
    qualityScore: { type: Number },
    tags: { type: [String], default: [] },
    usedBy: { type: [UsedByRefSchema], default: [] },
}, { timestamps: true });
// Indexes
GeneratedCopySchema.index({ tenantId: 1, context: 1, createdAt: -1 });
GeneratedCopySchema.index({ tags: 1 });
exports.GeneratedCopyModel = mongoose_1.default.models.GeneratedCopy || mongoose_1.default.model('GeneratedCopy', GeneratedCopySchema);
class GeneratedCopy {
    static async create(data) {
        return exports.GeneratedCopyModel.create(data);
    }
    static async findByTenant(tenantId) {
        return exports.GeneratedCopyModel.find({ tenantId }).sort({ createdAt: -1 }).exec();
    }
    static async appendUsage(id, ref) {
        return exports.GeneratedCopyModel.findByIdAndUpdate(id, { $push: { usedBy: ref } }, { new: true }).exec();
    }
}
exports.GeneratedCopy = GeneratedCopy;
exports.default = exports.GeneratedCopyModel;
