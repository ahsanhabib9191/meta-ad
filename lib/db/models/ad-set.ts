import mongoose, { Schema, Document, Model } from 'mongoose';

export type AdSetStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT';
export type LearningPhaseStatus = 'LEARNING' | 'ACTIVE' | 'LEARNING_LIMITED' | 'NOT_STARTED';

export interface ITargeting {
  audienceSize?: number;
  ageMin?: number;
  ageMax?: number;
  genders?: number[];
  locations?: string[];
  interests?: string[];
  customAudiences?: string[];
  lookalikes?: string[];
  exclusions?: Record<string, any>;
}

export interface IAdSet extends Document {
  adSetId: string;
  campaignId: string;
  accountId: string;
  name: string;
  status: AdSetStatus;
  budget: number;
  targeting: ITargeting;
  learningPhaseStatus: LearningPhaseStatus;
  optimizationGoal: string;
  deliveryStatus?: string;
  optimizationEventsCount?: number;
  ageDays?: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TargetingSchema = new Schema<ITargeting>({
  audienceSize: { type: Number, min: 0 },
  ageMin: { type: Number },
  ageMax: { type: Number },
  genders: { type: [Number] },
  locations: { type: [String] },
  interests: { type: [String] },
  customAudiences: { type: [String] },
  lookalikes: { type: [String] },
  exclusions: { type: Schema.Types.Mixed },
}, { _id: false });

const AdSetSchema = new Schema<IAdSet>({
  adSetId: { type: String, required: true },
  campaignId: { type: String, required: true },
  accountId: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, required: true },
  budget: { type: Number, required: true, min: 0 },
  targeting: { type: TargetingSchema, required: true },
  learningPhaseStatus: { type: String, required: true },
  optimizationGoal: { type: String, required: true },
  deliveryStatus: { type: String },
  optimizationEventsCount: { type: Number, min: 0 },
  ageDays: { type: Number, min: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });

// Indexes
AdSetSchema.index({ adSetId: 1 }, { unique: true });
AdSetSchema.index({ campaignId: 1, status: 1 });
AdSetSchema.index({ accountId: 1, status: 1 });
AdSetSchema.index({ learningPhaseStatus: 1 });
AdSetSchema.index({ status: 1, learningPhaseStatus: 1 });

export const AdSetModel: Model<IAdSet> =
  mongoose.models.AdSet || mongoose.model<IAdSet>('AdSet', AdSetSchema);

export default AdSetModel;
