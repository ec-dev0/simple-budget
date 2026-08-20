import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { api } from "./api.ts";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const DIST = resolve(import.meta.dir, "..", "..", "web", "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

async function readStatic(relPath: string): Promise<Response | null> {
  const filePath = resolve(DIST, "." + relPath);
  if (!filePath.startsWith(DIST + sep) && filePath !== resolve(DIST, "index.html")) {
    return null;
  }
  const buf = await readFile(filePath).catch(() => null);
  if (!buf) return null;
  const mime = MIME[extname(filePath)] ?? "application/octet-stream";
  // Solo los assets con hash de Vite (/assets/) son inmutables; el resto
  // (index.html, docs…) se revalida en cada petición para no servir versiones viejas.
  const isHashedAsset = relPath.startsWith("/assets/");
  return new Response(buf, {
    headers: {
      "content-type": mime,
      "cache-control": isHashedAsset ? "public, max-age=31536000, immutable" : "no-cache",
    },
  });
}

const app = new Hono();

// Cabeceras de seguridad básicas en todas las respuestas
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
});

app.route("/api", api);

app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/api")) return next();
  const res = await readStatic(c.req.path);
  if (res) return res;
  return next();
});

app.get("*", (c) => {
  if (c.req.path.startsWith("/api")) return c.text("Not found", 404);
  return readStatic("/index.html").then(
    (res) => res ?? c.text("Not found", 404),
    () => c.text("Simple Budget: ejecuta `bun run build` en la raíz para generar la interfaz.", 200)
  );
});

console.log(`[simple-budget] API + web escuchando en http://${HOST}:${PORT}`);
console.log(`[simple-budget] SQLite en ${process.env.DB_PATH ?? "./data/budget.db"}`);

export default {
  port: PORT,
  hostname: HOST,
  fetch: app.fetch,
};
