import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const devPort = parseInt(process.env.VITE_DEV_PORT || "5173", 10);
const apiPort = parseInt(process.env.API_PORT || "3001", 10);

const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: devPort,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});
