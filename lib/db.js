import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "english.db");

function createDb() {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE COLLATE NOCASE,
      translation TEXT NOT NULL DEFAULT '',
      level INTEGER NOT NULL DEFAULT 1,
      last_checked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      study_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'generated',
      words_json TEXT NOT NULL DEFAULT '[]',
      exercises_json TEXT,
      result_json TEXT,
      completed_at TEXT
    );
  `);

  try {
    sqlite.exec(`
      DELETE FROM lessons
      WHERE exercises_json IS NOT NULL
        AND trim(substr(exercises_json, 1, 1)) = '[';
    `);
  } catch {
    // ignore (e.g. database locked by another tool at startup)
  }

  return drizzle(sqlite, { schema });
}

export const db = globalThis.__englishDb ?? (globalThis.__englishDb = createDb());
