import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const devPort = parseInt(process.env.VITE_DEV_PORT || "5173", 10);
const apiPort = parseInt(process.env.API_PORT || "3001", 10);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: devPort,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
