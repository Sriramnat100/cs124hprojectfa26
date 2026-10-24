import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Requests to /api/... are forwarded to the FastAPI server on port 8000.
// Set API_PORT to use a different one (e.g. when two copies of the app run at once).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT || 8000}`,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
