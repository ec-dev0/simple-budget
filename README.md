# Simple Budget

> Your expense ledger. Main documentation available in two languages:
> [Español](README.es.md) · [Contributing](CONTRIBUTING.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-3c7a53?style=flat-square)](LICENSE)
[![Backend: Bun + Hono](https://img.shields.io/badge/backend-Bun%20%2B%20Hono-fbf0df?style=flat-square)](https://bun.sh)
[![Database: SQLite](https://img.shields.io/badge/database-SQLite-0d9488?style=flat-square)](https://sqlite.org)
[![Frontend: Svelte 5](https://img.shields.io/badge/frontend-Svelte%205-db2777?style=flat-square)](https://svelte.dev)
[![Deploy: Docker](https://img.shields.io/badge/deploy-Docker-5b6ee1?style=flat-square)](Dockerfile)
[![Image: ghcr.io](https://img.shields.io/badge/image-ghcr.io-5b6ee1?style=flat-square)](https://github.com/ec-dev0/simple-budget/pkgs/container/simple-budget)

## Screenshots

<p align="center">
  <img src="docs/screenshots/preview1.png" alt="Main view of Simple Budget" />
</p>

## What is Simple Budget?

Simple Budget is a small personal app to **control a budget** in a simple, functional way. The flow is straightforward:

1. You set an **initial amount** (e.g. "Home", €15,000).
2. You split it into **categories** with their own limit (e.g. "Kitchen", €3,000).
3. You log each **item** with:
   - **Estimated cost** (what you plan to spend).
   - **Actual cost** (what you end up paying).
   - **Bought** / **pending** state.
4. The balance computes itself: spent, pending, remaining and used percentage update in real time as you tick items off.

It's built for real situations like **kitting out a new home**, a personal project, or any shopping list with amounts. It doesn't try to be a full financial system: the idea is an "open notebook" you understand at first sight.

## Features

- **Bilingual UI** (Spanish / English), chosen on first launch and switchable from the header.
- **Per-budget currency** (EUR, USD, GBP, …) with a **default currency** set during onboarding.
- **Light and dark theme** with manual toggle and respect for the OS preference.
- **Embedded SQLite database** (`bun:sqlite`) — no external services, no extra Docker compose.
- **Complete, documented REST API** (`docs/API.md`) to wire into your scripts, spreadsheets or another frontend.
- **Export / Import** in a versioned JSON format: for backups, migrating between instances or syncing.
- **Accessibility**: AA contrast in both themes, keyboard navigation, semantic labels.
- **Lucide icons** (MIT) and **Instrument Sans** typography (OFL), all self-hosted.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Bun ≥ 1.2 | Fast startup, native TS support, embedded SQLite. |
| Backend | Hono | Minimalist routing on `Bun.serve` with Zod validation. |
| Database | `bun:sqlite` | Zero native dependencies, single file easy to back up. |
| Frontend | Svelte 5 + Vite | Reactivity with *runes* (`$state`, `$derived`), small bundles. |
| Styles | Tailwind CSS v4 | Utility-first, no CSS-in-JS, theming with `class="dark"`. |
| Validation | Zod | Same schemas on the client (forms) and the server (input). |
| Deploy | Multi-stage Docker on `oven/bun` | Single image, persistent volume for the DB. |

## Repository structure

```
.
├── server/              REST API + data layer
│   ├── src/
│   │   ├── db.ts        SQLite connection and versioned migrations
│   │   ├── repo.ts      Data functions and summaries
│   │   ├── api.ts       REST routes (Hono + Zod)
│   │   ├── validation.ts Input Zod schemas
│   │   ├── export.ts    Versioned-format serialization and loading
│   │   └── index.ts     Entry point: API + serves the built UI
│   └── data/            SQLite database (gitignored)
├── web/                 Svelte 5 UI
│   ├── src/
│   │   ├── App.svelte         Bootstrap and simple routing
│   │   ├── components/        UI components
│   │   └── lib/
│   │       ├── api.ts         HTTP client
│   │       ├── store.svelte.ts Reactive state (runes)
│   │       ├── theme.svelte.ts Light/dark theme
│   │       ├── format.ts      Money and date helpers
│   │       ├── i18n/          ES / EN dictionaries + reactive store and t() helper
│   │       ├── types.ts       Shared client ↔ API types
│   │       └── ui.ts          Reusable Tailwind classes
│   └── dist/            Build (gitignored)
├── data/                Default Docker volume (gitignored)
├── docs/
│   └── API.md           Full REST reference
├── README.md            This file
├── README.es.md         Documentación en español
├── Dockerfile           Multi-stage build
├── docker-compose.yml   Single-service orchestration
└── CONTRIBUTING.md      Contribution guide
```

## Getting started (development)

Requirement: [Bun](https://bun.sh) ≥ 1.2.

```bash
bun install            # installs server + web (workspaces)

# terminal 1 — API on :3000
bun run dev:server
# terminal 2 — UI on :5173 (proxies /api)
bun run dev:web
```

Open `http://localhost:5173`. On first launch an **onboarding** screen asks for language and default currency. To skip it and seed demo data:

```bash
bun run db:seed
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port of the unified server (API + static web). |
| `HOST` | `0.0.0.0` | Network interface to listen on. |
| `DB_PATH` | `./data/budget.db` | Path of the SQLite file. |

See `.env.example`.

## Production

```bash
bun run build      # builds the web → web/dist
bun start          # Bun serves API + web on :3000
```

### Docker

Each push to `main` automatically publishes a Docker image to **GitHub Container Registry**. Pull and run it directly, without cloning the repo:

```bash
docker pull ghcr.io/ec-dev0/simple-budget:latest

docker run -d \
  --name simple-budget \
  --restart unless-stopped \
  -p 3000:3000 \
  -v budget-data:/app/data \
  ghcr.io/ec-dev0/simple-budget:latest
# open http://localhost:3000
```

Want to build the image yourself?

```bash
docker compose up -d --build
# open http://localhost:3000
```

The database lives in the `budget-data` volume (`/app/data/budget.db`). To back it up, just copy that file; to restore, replace it and restart the container.

## REST API

The full reference (endpoints, bodies, responses, **stable error codes** and examples in `curl` / JavaScript / Python) is in [`API.md`](docs/API.md).

Quick summary:

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Service status |
| GET | `/api/settings` | Preferences (language, currency, onboarding flag) |
| PATCH | `/api/settings` | Update preferences |
| GET | `/api/budgets` | Budget list |
| POST | `/api/budgets` | Create budget |
| GET | `/api/budgets/:id` | Detail: categories, items and summary |
| PATCH | `/api/budgets/:id` | Update budget |
| DELETE | `/api/budgets/:id` | Delete budget (cascades) |
| GET | `/api/budgets/:id/categories` | Categories of a budget |
| POST | `/api/budgets/:id/categories` | Create category |
| PATCH | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category (cascades to items) |
| POST | `/api/categories/:id/items` | Create item |
| GET | `/api/items/:id` | Item detail |
| PATCH | `/api/items/:id` | Update item |
| PATCH | `/api/items/:id/purchase` | Mark bought / pending + actual cost |
| DELETE | `/api/items/:id` | Delete item |
| GET | `/api/export` | Downloads all data as versioned JSON |
| POST | `/api/import` | Loads data from JSON (keeps IDs, replaces matches) |

Field names use **snake_case in responses** (DB rows) and **camelCase in request bodies** (`initialAmount`, `estimatedCost`, `actualCost`, `limitAmount`).

### Error codes

Error responses follow a stable shape:

```json
{
  "error": {
    "code": "ERR_REQUIRED_NAME",
    "message": "El nombre es obligatorio",
    "issues": [{"path": ["name"], "code": "ERR_REQUIRED"}]
  }
}
```

The frontend translates `code` according to the active language. Current codes are listed in [`API.md`](docs/API.md).

### Backup and migration

The **Export** / **Import** buttons in the header produce and consume a versioned `.json` (`format: "simple-budget/export", version: 1`). Meant for:

- **Quick backup**: download the file every now and then.
- **Migration**: spin up a new instance and load the latest backup.
- **Sync**: re-importing the same file duplicates nothing — records with matching IDs are updated.

### Example

```bash
# Create a budget
curl -X POST http://localhost:3000/api/budgets \
  -H 'content-type: application/json' \
  -d '{"name":"Home","initialAmount":15000,"currency":"EUR"}'

# Read preferences
curl http://localhost:3000/api/settings
```

## Security notes

- Simple Budget has **no authentication**: it's a personal, self-hosted app. Expose it only on your machine / local network, or behind a reverse proxy with auth.
- The API sends **no CORS headers**: a page from another origin can't read it from a browser; scripts and CLI tools (`curl`, Python, …) work unchanged.
- The Docker image runs as a **non-root user** on the minimal `oven/bun:1-slim` base.
- `POST /api/import` rejects bodies larger than **5 MB**.

## Internationalization

The whole UI goes through a `web/src/lib/i18n/` module with two complete dictionaries (`es.ts`, `en.ts`) and a reactive `t("key")` helper. To add a new language see [`CONTRIBUTING.md`](CONTRIBUTING.md).

The language and default currency live in a **`settings` table** inside the same SQLite database. They're updated via `PATCH /api/settings`.

## Verification

```bash
bun test           # data layer and API tests
bun run check      # svelte-check (web types)
bunx tsc --noEmit  # backend types (from server/)
```

## License

[MIT](LICENSE) — use, modify and redistribute freely, keeping the copyright notice.
