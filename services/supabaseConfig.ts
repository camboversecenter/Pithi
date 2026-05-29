
/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tkhdcccgvwpnhqgxhymg.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraGRjY2NndndwbmhxZ3hoeW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTczNDYsImV4cCI6MjA4MTM5MzM0Nn0.THb6VbcBW8p8Ud6Hh0T7BjgrZ3py45q5G2dXdSlXHGs';

export const supabase = createClient(supabaseUrl, supabaseKey);
