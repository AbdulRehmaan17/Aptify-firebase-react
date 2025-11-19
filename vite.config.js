import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Ensure environment variables are loaded
  envPrefix: 'VITE_',
  // Clear cache on build issues
  server: {
    hmr: true,
  },
});
