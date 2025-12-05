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
exports.initializeDatabase = initializeDatabase;
const client_1 = require("./client");
async function initializeDatabase() {
    await (0, client_1.connectDB)();
    const { CampaignModel } = await Promise.resolve().then(() => __importStar(require('./models/campaign')));
    const { OptimizationLogModel } = await Promise.resolve().then(() => __importStar(require('./models/optimization-log')));
    const { TenantModel } = await Promise.resolve().then(() => __importStar(require('./models/Tenant')));
    const { MetaConnectionModel } = await Promise.resolve().then(() => __importStar(require('./models/MetaConnection')));
    const { WebsiteAuditModel } = await Promise.resolve().then(() => __importStar(require('./models/WebsiteAudit')));
    const { GeneratedCopyModel } = await Promise.resolve().then(() => __importStar(require('./models/GeneratedCopy')));
    await Promise.all([
        CampaignModel.syncIndexes(),
        OptimizationLogModel.syncIndexes(),
        TenantModel.syncIndexes(),
        MetaConnectionModel.syncIndexes(),
        WebsiteAuditModel.syncIndexes(),
        GeneratedCopyModel.syncIndexes(),
    ]);
    console.log('✅ Database initialized with all required models and indexes');
}
