import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IP addresses (0.0.0.0) so smartphone on Wi-Fi can connect
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
