import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from '../lib/middleware/error-handler';
import campaignRoutes from './routes/campaigns';
import adSetRoutes from './routes/ad-sets';
import adRoutes from './routes/ads';
import performanceRoutes from './routes/performance';
import authRoutes from './routes/auth';
import optimizationRoutes from './routes/optimization';
import webhookRoutes from './routes/webhooks';
import { initializeDatabase } from '../lib/db';
import { logger } from '../lib/utils/logger';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ad-sets', adSetRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/webhooks', webhookRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      await initializeDatabase();
      logger.info('Database connected');
    } else {
      logger.warn('MONGODB_URI not set - running without database');
    }

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

export default app;
