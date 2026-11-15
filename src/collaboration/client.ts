import { createClient } from '@supabase/supabase-js';
import { validatePublicConfig } from './config';
const config = validatePublicConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
// A session is kept in memory only; it is not written to browser storage.
export const cloudClient = config ? createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
