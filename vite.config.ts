import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true, // Automatically open browser
    host: true, // Allow external connections
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
