import mongoose, { Schema, Document, Model } from 'mongoose';

export type ConnectionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'PENDING' | 'ERROR';

export interface IMetaConnection extends Document {
  tenantId: string;
  adAccountId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  permissions?: string[];
  status: ConnectionStatus;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MetaConnectionSchema = new Schema<IMetaConnection>({
  tenantId: { type: String, required: true, index: true },
  adAccountId: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  tokenExpiresAt: { type: Date },
  permissions: { type: [String], default: [] },
  status: { type: String, required: true, index: true },
  lastSyncedAt: { type: Date },
}, { timestamps: true });

// Indexes
MetaConnectionSchema.index({ tenantId: 1, adAccountId: 1 }, { unique: true });
MetaConnectionSchema.index({ status: 1 });
MetaConnectionSchema.index({ tokenExpiresAt: 1 }, { sparse: true });

export const MetaConnectionModel: Model<IMetaConnection> =
  mongoose.models.MetaConnection || mongoose.model<IMetaConnection>('MetaConnection', MetaConnectionSchema);

export class MetaConnection {
  static async create(data: Partial<IMetaConnection>): Promise<IMetaConnection> {
    return MetaConnectionModel.create(data);
  }
  static async findByTenantAndAccount(tenantId: string, adAccountId: string): Promise<IMetaConnection | null> {
    return MetaConnectionModel.findOne({ tenantId, adAccountId }).exec();
  }
  static async updateTokens(tenantId: string, adAccountId: string, update: Partial<IMetaConnection>): Promise<IMetaConnection | null> {
    return MetaConnectionModel.findOneAndUpdate({ tenantId, adAccountId }, update, { new: true }).exec();
  }
  static async revoke(tenantId: string, adAccountId: string): Promise<IMetaConnection | null> {
    return MetaConnectionModel.findOneAndUpdate({ tenantId, adAccountId }, { status: 'REVOKED' }, { new: true }).exec();
  }
}

export default MetaConnectionModel;
