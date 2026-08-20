# Contributing to Simple Budget

Thanks for your interest in the project. This guide explains how to set up a dev environment, what conventions we follow, and how to ship a change.

## Code of conduct

Be respectful. Disagreement is welcome, but personal attacks are not. Assume good faith, ask before assuming intent.

## Bug reports and feature requests

Open an issue with:

- A clear title and a short summary.
- Steps to reproduce (for bugs).
- Expected vs actual behaviour.
- The version, the platform and the deployment (Docker, dev, etc.).
- For UI bugs: a screenshot or screen recording.

## Development setup

Requirement: [Bun](https://bun.sh) ≥ 1.2.

```bash
git clone <repo>
cd simple-budget
bun install
```

Run the two services in separate terminals:

```bash
bun run dev:server     # API on :3000
bun run dev:web        # web on :5173, proxies /api → :3000
```

Seed synthetic demo data:

```bash
bun run db:seed
```

Smoke check the combined build:

```bash
bun run build
bun start
# → http://localhost:3000
```

Tests and type checks:

```bash
bun test                # data layer + API tests
bun run check           # svelte-check (web)
bunx tsc --noEmit       # run from server/ for backend types
```

## Project layout

```
server/src/
  db.ts        SQLite connection + migrations (versioned, additive only)
  repo.ts      Pure data functions and summaries
  api.ts       Hono routes
  validation.ts Zod input schemas (with stable error codes)
  export.ts    Versioned JSON payload
  index.ts     Entrypoint: API + serves built UI
web/src/
  App.svelte
  components/
  lib/
    api.ts
    store.svelte.ts    Reactive state (Svelte 5 runes)
    theme.svelte.ts    Light / dark theme
    format.ts          Money / date helpers (locale-aware)
    i18n/              Dictionaries (es.ts, en.ts) + t() helper
    types.ts
    ui.ts
```

## Conventions

### Backend (Bun + Hono + Zod)

- TypeScript strict. No `any` unless wrapping an external untyped API, and then it's commented.
- Schemas live in `validation.ts`; the API file just composes them.
- Every error has a **stable code** in `ERR_*` form. The shape is `{ error: { code, message, issues? } }`. The frontend translates `code` according to the active language — the `message` is a fallback in Spanish (we keep the dev language consistent with the original codebase).
- Migrations are **additive**. Never edit a migration once it has been applied; write a new migration with the next version number.
- Prefer `repo.ts` functions for all data access. Routes should not run SQL directly.

### Frontend (Svelte 5 runes)

- Use runes: `$state`, `$derived`, `$derived.by`, `$effect`, `$props`. No stores from the old API.
- Snippets (`{#snippet}`, `{@render}`) instead of slots.
- All user-visible strings go through `i18n.t("key")` — never hard-code a string into `.svelte`. The construction is intentionally minimal to avoid over-engineering.
- Keep components small (~ 100–200 LOC). Extract sub-components before passing more than three props.
- Tailwind utility classes only; reuse from `lib/ui.ts` when repeated.
- Lucide icons are imported from `lucide-svelte` directly in the component that uses them (tree-shakable).
- Theme handling is centralised in `theme.svelte.ts`. Don't sprinkle `class="dark"`.

### Testing

- Backend: `bun test` covers the repo layer and critical API edge cases (settings defaults, validation, currency handling).
- Frontend: type-checking via `bun run check` is the baseline. Add component tests where logic gets non-trivial (use the existing testing setup if you add one).

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: …` — new feature.
- `fix: …` — bug fix.
- `refactor: …` — no behaviour change.
- `chore: …` — tooling, dependencies, CI.
- `docs: …` — README, comments, translation files (but translations go under `i18n/es|en/<file>.ts`).
- `i18n: add <locale>` — adding a new language dictionary.

One self-contained idea per commit. PRs are squash-merged.

## Adding a new language

The frontend i18n module is intentionally tiny. To add a third language (e.g. `de`):

1. Create `web/src/lib/i18n/de.ts` exporting a dictionary with **the same keys** as `es.ts`.
2. Edit `web/src/lib/i18n/index.ts`:
   - Extend `type Locale = "es" | "en" | "de"`.
   - Extend the `LOCALES` map.
   - Add the locale to the language picker in the header.
3. Extend the backend `Locale` enum in `server/src/validation.ts` (in the `settingsSchema`) and the default in the migration.
4. Translate any hard-coded `Intl` formats in `format.ts` if needed (dates / relative phrasing).
5. Add the locale flag to the user-facing selector in `Onboarding.svelte`.

Strings in `format.ts` (`relativeDate`, `PRIORITY_LABEL`) live outside the dictionary because they are runtime functions. When they need to vary per locale we either:
- pass the locale into the function and branch on it inline, or
- move the lookup table into the matching dictionary and re-export it.

Pick the option that fits the size of the change.

## Adding an API endpoint

1. Define the input schema in `server/src/validation.ts` (with stable `ERR_*` codes for messages).
2. Add the data function in `server/src/repo.ts`.
3. Register the route in `server/src/api.ts` (with `zValidator("json", …)` / `zValidator("param", …)`).
4. Document it in `docs/API.md`: method, path, body, success response, error codes, an example.
5. Add a test in `server/src/repo.test.ts` (or a new file under `server/src/` if it grows).

## Adding a migration

Append to the `migrations` array in `server/src/db.ts`:

```ts
{
  version: 3,
  name: "short-description",
  sql: `
    CREATE TABLE …;
    CREATE INDEX …;
  `,
}
```

Constraints:

- The new statement must be **idempotent** (`IF NOT EXISTS`) and reversible manually if necessary.
- Default data (`INSERT OR IGNORE INTO …`) belongs in the same migration that creates the table.
- Never lower `PRAGMA user_version`. Migrations run forward automatically on boot.

## Adding a setting

If you need a new key in `settings`:

1. Add the column **only if** you cannot express it as a row (prefer the singleton-by-key shape).
2. Extend `getSettings()` in `server/src/repo.ts` and the corresponding Zod schema.
3. Surface it in the UI through `api.getSettings()` and expose a setter if needed.

## Design notes

- The product is **deliberately single-user**. There is no auth, no multi-tenancy. If you need it, that's a bigger conversation — open an issue first.
- The UI is a "La Libreta" aesthetic: warm paper tones in light, warm night tones in dark, a single grotesk font (Instrument Sans). Don't introduce another font without a discussion.
- No telemetry, no third-party scripts. All assets are self-hosted.
- Keep dependencies minimal. If you add one, justify it in the PR.

## Release flow

- `main` is always deployable.
- Tags follow `vMAJOR.MINOR.PATCH` (semver). `0.x` is pre-1.0; breaking changes bump MINOR.
- Docker images are built from `main` tags.

## License

By contributing you agree that your contributions are licensed under the project's [MIT License](LICENSE).
