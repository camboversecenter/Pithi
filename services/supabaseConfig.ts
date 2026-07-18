
import { createClient } from '@supabase/supabase-js';

// Prefer environment configuration (see .env.example); fall back to the project
// defaults so the public demo keeps working out of the box.
const env = ((import.meta as any).env) || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://fioumbuhowumfjptjzfy.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3VtYnVob3d1bWZqcHRqemZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjE0MTAsImV4cCI6MjA5NTU5NzQxMH0.5FZ8mG9sKZ7MKwssouCARU6arbrlhxBZWpsXClB6eQY';

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
