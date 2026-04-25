import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "b6a2-71-199-154-11.ngrok-free.app",
      "localhost",
      "127.0.0.1",
      "roughconsensus.xyz",
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
