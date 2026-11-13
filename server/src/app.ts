import express from 'express';
import cors from 'cors';
import reportsRouter from './routes/reports.js';
import healthRouter from './routes/health.js';
import announcementsRouter from './routes/announcements.js';
import coordinatorRouter from './routes/coordinator.js';
import { extractUserRole } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-User-Role'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(extractUserRole);

app.use('/health', healthRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/announcements', announcementsRouter);
app.use('/api/v1/coordinator/announcements', coordinatorRouter);

app.use(notFoundHandler);
app.use(errorHandler);
