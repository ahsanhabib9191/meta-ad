import mongoose, { Schema, Document, Model } from 'mongoose';
import { encrypt, decrypt } from '../../utils/crypto';

export type ConnectionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'PENDING' | 'ERROR';

export interface IMetaConnection extends Document {
  tenantId: string;
  adAccountId: string;
  accessToken: string; // stored encrypted
  refreshToken?: string; // stored encrypted
  tokenExpiresAt?: Date;
  permissions?: string[];
  status: ConnectionStatus;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  getAccessToken(): string;
  getRefreshToken(): string | undefined;
}

const MetaConnectionSchema = new Schema<IMetaConnection>({
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
  const doc = this as any;
  if (doc.isModified('accessToken')) {
    doc.accessToken = encrypt(doc.accessToken);
  }
  if (doc.isModified('refreshToken') && doc.refreshToken) {
    doc.refreshToken = encrypt(doc.refreshToken);
  }
  next();
});

// Helper methods to get decrypted tokens
MetaConnectionSchema.methods.getAccessToken = function (): string {
  return decrypt(this.accessToken);
};

MetaConnectionSchema.methods.getRefreshToken = function (): string | undefined {
  return this.refreshToken ? decrypt(this.refreshToken) : undefined;
};

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
    const toUpdate: any = { ...update };
    if (toUpdate.accessToken) toUpdate.accessToken = encrypt(toUpdate.accessToken);
    if (toUpdate.refreshToken) toUpdate.refreshToken = encrypt(toUpdate.refreshToken);
    return MetaConnectionModel.findOneAndUpdate({ tenantId, adAccountId }, toUpdate, { new: true }).exec();
  }
  static async revoke(tenantId: string, adAccountId: string): Promise<IMetaConnection | null> {
    return MetaConnectionModel.findOneAndUpdate({ tenantId, adAccountId }, { status: 'REVOKED' }, { new: true }).exec();
  }
}

export default MetaConnectionModel;
