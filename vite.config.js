import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/tickets': 'http://localhost:8000',
      '/ai': 'http://localhost:8000',
      '/reply': 'http://localhost:8000',
      '/tool-actions': 'http://localhost:8000',
      '/eval-runs': 'http://localhost:8000',
      '/knowledge': 'http://localhost:8000',
      '/customers': 'http://localhost:8000',
      '/orders': 'http://localhost:8000',
      '/health': 'http://localhost:8000'
    }
  }
});
