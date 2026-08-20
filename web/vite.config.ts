import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DOCS_SOURCE = resolve(import.meta.dirname, "..", "docs", "API.md");
const DOCS_DIST_PATH = "docs/API.md";

function docsPlugin(): Plugin {
  return {
    name: "simple-budget:docs",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/docs/API.md") return next();
        try {
          const buf = readFileSync(DOCS_SOURCE);
          res.setHeader("content-type", "text/markdown; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(buf);
        } catch {
          res.statusCode = 404;
          res.end("Not found");
        }
      });
    },
    closeBundle() {
      const dest = resolve(import.meta.dirname, "dist", DOCS_DIST_PATH);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(DOCS_SOURCE, dest);
    },
  };
}

export default defineConfig({
  plugins: [svelte(), tailwindcss(), docsPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    target: "esnext",
  },
});
