
import { createClient } from '@supabase/supabase-js';

// Supabase connection details come from the environment only — see
// `.env.example`. Never commit a project URL or key here: this module is
// bundled into the client, so anything hardcoded ships to every visitor and
// points every fork of this repository at the same database.
const env = ((import.meta as any).env) || {};

const supabaseUrl: string = env.VITE_SUPABASE_URL || '';
const supabaseKey: string = env.VITE_SUPABASE_ANON_KEY || '';

/** True when both Supabase variables are configured. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
    console.error(
        'PITHI: Supabase is not configured. Copy .env.example to .env.local and set ' +
        'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'
    );
}

/**
 * The project's auth callback URL, shown in the sign-in troubleshooting panel
 * and needed when registering the Google OAuth client. Empty until Supabase is
 * configured.
 */
export const supabaseCallbackUrl = supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : '';

// `createClient` throws on an empty URL, which would break the whole app before
// it can render the "not configured" guidance. Fall back to a syntactically
// valid placeholder that resolves nowhere so the UI still loads and every
// request fails cleanly instead.
const PLACEHOLDER_URL = 'https://placeholder.invalid';

export const supabase = createClient(
    supabaseUrl || PLACEHOLDER_URL,
    supabaseKey || 'public-anon-key-not-configured',
    {
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
    }
);
