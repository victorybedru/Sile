/**
 * Supabase Client Configuration (Server-Side)
 * File: server/src/config/supabase.ts
 * 
 * Securely initializes the Supabase client using the service-role key.
 * Disables browser-specific session persistence, auto token refresh,
 * and URL session detection.
 * 
 * Fails fast with clear diagnostics if required environment variables are missing.
 * Never initializes the client with placeholder or fake credentials.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables strictly from server/.env, with fallback to root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Fail fast: Verify required credentials exist
if (!supabaseUrl || !supabaseServiceRoleKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  throw new Error(
    `[Supabase Configuration Error] Missing required environment variable(s): ${missing.join(', ')}.\n` +
    `Please set them in "server/.env" using "server/.env.example" as a guide.\n` +
    `The backend server cannot start without valid Supabase credentials.`
  );
}

// Strict protocol validation: URL must use exactly 'https:' or 'http:'
try {
  const parsed = new URL(supabaseUrl);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Invalid protocol');
  }
} catch {
  throw new Error(
    `[Supabase Configuration Error] Invalid SUPABASE_URL format: "${supabaseUrl}". ` +
    `Expected a valid URL with http: or https: protocol (e.g., https://your-project.supabase.co).`
  );
}

/**
 * Authoritative server-side Supabase client instance.
 * Configured with service_role privileges to execute atomic stored procedures
 * and manage server-only tables securely.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
