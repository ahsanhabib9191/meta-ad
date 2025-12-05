import mongoose, { Schema, Document, Model } from 'mongoose';

export type OptimizationEntity = 'CAMPAIGN' | 'AD_SET' | 'AD' | 'ACCOUNT';

export interface IOptimizationLog extends Document {
  action: string; // e.g., PAUSE, SCALE, REDUCE_BUDGET, REFRESH_CREATIVE
  entityType: OptimizationEntity;
  entityId: string;
  ruleId?: string;
  success: boolean;
  executedAt: Date;
  details?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const OptimizationLogSchema = new Schema<IOptimizationLog>(
  {
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    ruleId: { type: String },
    success: { type: Boolean, required: true },
    executedAt: { type: Date, required: true, index: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Explicit indexes
OptimizationLogSchema.index({ entityType: 1, entityId: 1, executedAt: 1 });
OptimizationLogSchema.index({ ruleId: 1 });
OptimizationLogSchema.index({ success: 1, executedAt: 1 });

export const OptimizationLogModel: Model<IOptimizationLog> =
  mongoose.models.OptimizationLog ||
  mongoose.model<IOptimizationLog>('OptimizationLog', OptimizationLogSchema);

export default OptimizationLogModel;
