import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import eslint from "vite-plugin-eslint";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), eslint()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/tmdb-api": {
        target: "https://api.themoviedb.org/3",
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/tmdb-api/, ""),
      },
    },
  },
});
