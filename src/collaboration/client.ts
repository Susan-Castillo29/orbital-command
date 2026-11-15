import { createClient } from '@supabase/supabase-js';
import { validatePublicConfig } from './config';
const config = validatePublicConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
// Keep auth tab-scoped: a reload in this tab keeps the user signed in, while
// another tab or device still requires its own sign-in.
export const cloudClient = config ? createClient(config.url, config.key, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
