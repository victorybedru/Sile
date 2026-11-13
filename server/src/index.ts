import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from './app.js';
import { isSupabaseConfigured } from './config/supabase.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../.env') });
dotenv.config();

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => {
  console.log(`Sile API listening on http://localhost:${port}`);
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured. API starts, but database-backed endpoints will return an error.');
  }
});

function shutdown(signal: string) {
  console.log(`${signal} received. Closing Sile API...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
