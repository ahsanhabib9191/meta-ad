import mongoose, { Schema, Document, Model } from 'mongoose';

export type PlanTier = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

export interface ITenant extends Document {
  tenantId: string; // unique identifier
  name: string;
  primaryDomain?: string;
  plan: PlanTier;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>({
  tenantId: { type: String, required: true },
  name: { type: String, required: true },
  primaryDomain: { type: String },
  plan: { type: String, required: true },
  settings: { type: Schema.Types.Mixed },
}, { timestamps: true });

// Indexes
TenantSchema.index({ tenantId: 1 }, { unique: true });
TenantSchema.index({ primaryDomain: 1 }, { sparse: true });

export const TenantModel: Model<ITenant> =
  mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);

export class Tenant {
  static async create(data: Partial<ITenant>): Promise<ITenant> {
    return TenantModel.create(data);
  }
  static async findById(id: string): Promise<ITenant | null> {
    return TenantModel.findById(id).exec();
  }
  static async findByTenantId(tenantId: string): Promise<ITenant | null> {
    return TenantModel.findOne({ tenantId }).exec();
  }
  static async updateByTenantId(tenantId: string, data: Partial<ITenant>): Promise<ITenant | null> {
    return TenantModel.findOneAndUpdate({ tenantId }, data, { new: true }).exec();
  }
}

export default TenantModel;
