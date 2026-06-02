
/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fioumbuhowumfjptjzfy.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3VtYnVob3d1bWZqcHRqemZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjE0MTAsImV4cCI6MjA5NTU5NzQxMH0.5FZ8mG9sKZ7MKwssouCARU6arbrlhxBZWpsXClB6eQY';

export const supabase = createClient(supabaseUrl, supabaseKey);
