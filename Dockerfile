# syntax=docker/dockerfile:1.7
FROM oven/bun:1-slim AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY server/package.json server/
COPY web/package.json web/
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY server ./server
COPY web ./web
RUN bun run --cwd web build

RUN bun build \
      --compile \
      --minify \
      --sourcemap=none \
      --compile-exec-argv="--smol" \
      --outfile /out/simple-budget \
      server/src/index.ts

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini wget ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 app \
    && useradd --uid 1000 --gid app --home-dir /app --shell /usr/sbin/nologin app \
    && mkdir -p /app/data /app/web/dist \
    && chown -R app:app /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DB_PATH=/app/data/budget.db \
    WEB_DIST=/app/web/dist \
    BUN_OPTIONS=--smol

COPY --from=build --chown=app:app /out/simple-budget /app/simple-budget
COPY --from=build --chown=app:app /app/web/dist /app/web/dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /app/simple-budget

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=8s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
CMD ["/app/simple-budget"]
