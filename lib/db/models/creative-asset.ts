import mongoose, { Schema, Document, Model } from 'mongoose';

export type CreativeType = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'TEXT' | 'UNKNOWN';

export interface ICreativeUsageRef {
  entityType: 'CAMPAIGN' | 'AD_SET' | 'AD';
  entityId: string;
}

export interface ICreativeAsset extends Document {
  assetId: string; // external id or generated
  type: CreativeType;
  url: string;
  hash?: string; // content hash for deduplication
  metadata?: Record<string, any>;
  usedBy: ICreativeUsageRef[];
  createdAt: Date;
  updatedAt: Date;
}

const CreativeUsageRefSchema = new Schema<ICreativeUsageRef>(
  {
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
  },
  { _id: false }
);

const CreativeAssetSchema = new Schema<ICreativeAsset>(
  {
    assetId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    url: { type: String, required: true },
    hash: { type: String },
    metadata: { type: Schema.Types.Mixed },
    usedBy: { type: [CreativeUsageRefSchema], default: [] },
  },
  { timestamps: true }
);

// Explicit indexes
CreativeAssetSchema.index({ assetId: 1 }, { unique: true });
CreativeAssetSchema.index({ hash: 1 }, { unique: true, sparse: true });
CreativeAssetSchema.index({ 'usedBy.entityType': 1, 'usedBy.entityId': 1 });

export const CreativeAssetModel: Model<ICreativeAsset> =
  mongoose.models.CreativeAsset ||
  mongoose.model<ICreativeAsset>('CreativeAsset', CreativeAssetSchema);

export default CreativeAssetModel;
