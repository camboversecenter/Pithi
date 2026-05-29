
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    plugins: [react()],
    // API_KEY is now handled by Supabase Edge Functions securely
  };
});
