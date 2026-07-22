
import { createClient } from '@supabase/supabase-js';

// Prefer environment configuration (see .env.example); fall back to the project
// defaults so the public demo keeps working out of the box.
const env = ((import.meta as any).env) || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://tkhdcccgvwpnhqgxhymg.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraGRjY2NndndwbmhxZ3hoeW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTczNDYsImV4cCI6MjA4MTM5MzM0Nn0.THb6VbcBW8p8Ud6Hh0T7BjgrZ3py45q5G2dXdSlXHGs';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // PKCE returns the auth result as a `?code=` query param instead of a
        // `#access_token=` hash fragment. This is essential for PITHI because the
        // app uses HashRouter — an implicit-flow hash fragment would collide with
        // the router hash and the Google session would never be established.
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
    },
});
