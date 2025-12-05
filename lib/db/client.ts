import mongoose from 'mongoose';

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meta-ads-optimization';

// Connection options
const options: mongoose.ConnectOptions = {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
};

/**
 * Global mongoose connection cache
 */
declare global {
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Initialize and return MongoDB connection
 */
export async function connectDB(): Promise<mongoose.Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, options).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }

  return cached.conn;
}

/**
 * Initialize database with indexes and setup
 */
export async function initializeDatabase(): Promise<void> {
  await connectDB();
  
  // Import models to register them
  const { CampaignModel } = await import('./models/campaign');
  const { AdAccountModel } = await import('./models/ad-account');
  const { PerformanceSnapshotModel } = await import('./models/performance-snapshot');
  const { OptimizationLogModel } = await import('./models/optimization-log');
  const { AudienceInsightModel } = await import('./models/audience-insight');
  const { CreativeAssetModel } = await import('./models/creative-asset');

  // Ensure indexes are created
  await Promise.all([
    CampaignModel.syncIndexes(),
    AdAccountModel.syncIndexes(),
    PerformanceSnapshotModel.syncIndexes(),
    OptimizationLogModel.syncIndexes(),
    AudienceInsightModel.syncIndexes(),
    CreativeAssetModel.syncIndexes(),
  ]);

  console.log('✅ Database initialized with all models and indexes');
}

/**
 * Close database connection
 */
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('✅ MongoDB disconnected');
  }
}

export default mongoose;
