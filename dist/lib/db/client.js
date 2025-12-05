"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
const mongoose_1 = __importDefault(require("mongoose"));
// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meta-ads-optimization';
// Connection options
const options = {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 10000,
};
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}
/**
 * Initialize and return MongoDB connection
 */
async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        cached.promise = mongoose_1.default.connect(MONGODB_URI, options).then((mongoose) => {
            console.log('✅ MongoDB connected successfully');
            return mongoose.connection;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (error) {
        cached.promise = null;
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
    return cached.conn;
}
/**
 * Initialize database with indexes and setup
 */
// initializeDatabase relocated to lib/db/index.ts
/**
 * Close database connection
 */
async function disconnectDB() {
    if (cached.conn) {
        await mongoose_1.default.disconnect();
        cached.conn = null;
        cached.promise = null;
        console.log('✅ MongoDB disconnected');
    }
}
exports.default = mongoose_1.default;
