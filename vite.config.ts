import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves project sites under /<repo>/, so the build needs that base.
// The local dev server and other hosts keep the root base.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/agent-context-panel/" : "/",
  plugins: [react(), tailwindcss()],
});
