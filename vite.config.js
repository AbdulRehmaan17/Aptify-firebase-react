import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Ensure environment variables are loaded
  // Only variables with VITE_ prefix are exposed to client code
  envPrefix: 'VITE_',
  // Clear cache on build issues
  server: {
    hmr: true,
  },
  // Explicitly define which env files to load
  // Vite loads: .env, .env.local, .env.[mode], .env.[mode].local
  // Priority: .env.[mode].local > .env.local > .env.[mode] > .env
});
