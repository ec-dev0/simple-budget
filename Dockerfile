# syntax=docker/dockerfile:1.7
# ---- Etapa 1: dependencias + build de la web ----
FROM oven/bun:1-slim AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY server/package.json server/
COPY web/package.json web/
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY . .
RUN bun run --cwd web build

# ---- Etapa 2: runtime ----
FROM oven/bun:1-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DB_PATH=/app/data/budget.db

# Solo dependencias de producción (las de web son devDependencies de build)
COPY package.json bun.lock ./
COPY server/package.json server/
COPY web/package.json web/
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile

COPY server/src server/src
COPY --from=build /app/web/dist web/dist

# Usuario no-root; la base de datos vive en /app/data (volumen)
RUN mkdir -p /app/data && chown -R bun:bun /app/data
USER bun

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "server/src/index.ts"]
