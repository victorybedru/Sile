/**
 * Health Check Route
 * File: server/src/routes/health.ts
 * 
 * Exposes server operational status, uptime, and database connectivity.
 */

import { Request, Response, Router } from 'express';
import { isSupabaseConfigured, supabase } from '../config/supabase.js';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const supabaseConfigured = isSupabaseConfigured();
  let dbStatus: 'connected' | 'not_configured' | 'unreachable' = supabaseConfigured ? 'connected' : 'not_configured';

  if (supabaseConfigured) {
    try {
      const { error } = await supabase.from('reports').select('id', { head: true, count: 'exact' }).limit(1);
      if (error) {
        dbStatus = 'unreachable';
      }
    } catch {
      dbStatus = 'unreachable';
    }
  }

  const isHealthy = dbStatus === 'connected';

  res.status(200).json({
    success: true,
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'healthy',
      database: dbStatus,
    },
  });
});

export default router;
