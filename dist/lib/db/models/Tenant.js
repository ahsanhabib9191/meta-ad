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
exports.Tenant = exports.TenantModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TenantSchema = new mongoose_1.Schema({
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    primaryDomain: { type: String },
    plan: { type: String, required: true },
    settings: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
// Indexes
TenantSchema.index({ tenantId: 1 }, { unique: true });
TenantSchema.index({ primaryDomain: 1 }, { sparse: true });
exports.TenantModel = mongoose_1.default.models.Tenant || mongoose_1.default.model('Tenant', TenantSchema);
class Tenant {
    static async create(data) {
        return exports.TenantModel.create(data);
    }
    static async findById(id) {
        return exports.TenantModel.findById(id).exec();
    }
    static async findByTenantId(tenantId) {
        return exports.TenantModel.findOne({ tenantId }).exec();
    }
    static async updateByTenantId(tenantId, data) {
        return exports.TenantModel.findOneAndUpdate({ tenantId }, data, { new: true }).exec();
    }
}
exports.Tenant = Tenant;
exports.default = exports.TenantModel;
