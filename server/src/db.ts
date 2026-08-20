import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_DB_PATH = resolve(import.meta.dir, "..", "data", "budget.db");

export const dbPath =
  process.env.DB_PATH && process.env.DB_PATH.length > 0
    ? resolve(process.env.DB_PATH)
    : DEFAULT_DB_PATH;

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath, { create: true });

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

type Migration = { version: number; name: string; sql: string; post?: () => void };

function ts(): string {
  return new Date().toISOString();
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "initial-schema",
    sql: `
      CREATE TABLE IF NOT EXISTS budgets (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        description   TEXT NOT NULL DEFAULT '',
        initial_amount REAL NOT NULL DEFAULT 0,
        currency      TEXT NOT NULL DEFAULT 'EUR',
        color         TEXT NOT NULL DEFAULT '#6366f1',
        icon          TEXT NOT NULL DEFAULT 'wallet',
        archived      INTEGER NOT NULL DEFAULT 0,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id            TEXT PRIMARY KEY,
        budget_id     TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        description   TEXT NOT NULL DEFAULT '',
        icon          TEXT NOT NULL DEFAULT 'package',
        color         TEXT NOT NULL DEFAULT '#6366f1',
        limit_amount  REAL,
        archived      INTEGER NOT NULL DEFAULT 0,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS items (
        id             TEXT PRIMARY KEY,
        category_id    TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name           TEXT NOT NULL,
        description    TEXT NOT NULL DEFAULT '',
        quantity       REAL NOT NULL DEFAULT 1,
        unit           TEXT,
        estimated_cost REAL,
        actual_cost    REAL,
        purchased      INTEGER NOT NULL DEFAULT 0,
        purchased_at   TEXT,
        priority       INTEGER NOT NULL DEFAULT 0,
        store          TEXT,
        link           TEXT,
        due_date       TEXT,
        notes          TEXT NOT NULL DEFAULT '',
        sort_order     INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_categories_budget ON categories(budget_id);
      CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
      CREATE INDEX IF NOT EXISTS idx_items_purchased ON items(purchased);
    `,
  },
  {
    version: 2,
    name: "settings",
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
    post: () => {
      const stamp = ts();
      const stmt = db.prepare(
        "INSERT OR IGNORE INTO settings(key, value, updated_at) VALUES (?, ?, ?)"
      );
      stmt.run("language", "es", stamp);
      stmt.run("currency", "EUR", stamp);
      stmt.run("onboarded", "0", stamp);
    },
  },
];

function runMigrations() {
  const current = db.query("PRAGMA user_version").get() as { user_version: number };
  for (const m of migrations) {
    if (current.user_version < m.version) {
      db.transaction(() => {
        db.exec(m.sql);
        m.post?.();
        db.exec(`PRAGMA user_version = ${m.version}`);
      })();
      console.log(`[db] migrated to v${m.version} (${m.name})`);
    }
  }
}

runMigrations();

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function round2(n: number | null | undefined): number | null {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  return Math.round(n * 100) / 100;
}
