import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devPort = Number.parseInt(process.env.VITE_MCP_PLAYGROUND_PORT || '5273', 10);
const apiPort = Number.parseInt(process.env.API_PORT || '3001', 10);

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});
