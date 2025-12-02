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
  // Dev server configuration
  server: {
    hmr: true,
    // Open the app in the system browser instead of the editor
    open: true,
    // Explicitly choose the browser; change to 'edge' or 'firefox' if preferred
    browser: 'chrome',
  },
});
