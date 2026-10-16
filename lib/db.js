import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "english.db");

// Legacy lesson rows stored `exercises_json` as a top-level JSON array, which
// the current parser cannot read. We keep the lessons (and their results) but
// clear the incompatible content exactly once, tracked by PRAGMA user_version.
const SCHEMA_VERSION = 1;

function migrateLegacyLessons(sqlite) {
  const current = Number(sqlite.pragma("user_version", { simple: true })) || 0;
  if (current >= SCHEMA_VERSION) return;

  try {
    sqlite.exec(`
      UPDATE lessons
      SET exercises_json = NULL
      WHERE exercises_json IS NOT NULL
        AND trim(substr(exercises_json, 1, 1)) = '[';
    `);
  } catch {
    // ignore (e.g. database locked by another tool at startup)
  }

  sqlite.pragma(`user_version = ${SCHEMA_VERSION}`);
}

function createDb() {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE COLLATE NOCASE,
      translation TEXT NOT NULL DEFAULT '',
      definition TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      example TEXT NOT NULL DEFAULT '',
      forms TEXT NOT NULL DEFAULT '[]',
      level INTEGER NOT NULL DEFAULT 1,
      last_checked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      study_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'generated',
      category TEXT NOT NULL DEFAULT 'regular',
      source_lesson_id INTEGER,
      words_json TEXT NOT NULL DEFAULT '[]',
      exercises_json TEXT,
      result_json TEXT,
      completed_at TEXT,
      passed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_words_review
      ON words(last_checked_at, level);
    CREATE INDEX IF NOT EXISTS idx_lessons_lookup
      ON lessons(study_date, category, status);
  `);

  const lessonColumns = sqlite
    .prepare("PRAGMA table_info(lessons)")
    .all()
    .map((column) => column.name);

  const addLessonColumn = (name, ddl) => {
    if (lessonColumns.includes(name)) return;
    try {
      sqlite.exec(ddl);
    } catch {
      // column already exists (e.g. added by a concurrent process)
    }
  };

  addLessonColumn(
    "category",
    "ALTER TABLE lessons ADD COLUMN category TEXT NOT NULL DEFAULT 'regular'",
  );
  addLessonColumn(
    "source_lesson_id",
    "ALTER TABLE lessons ADD COLUMN source_lesson_id INTEGER",
  );
  addLessonColumn("passed_at", "ALTER TABLE lessons ADD COLUMN passed_at TEXT");

  const wordColumns = sqlite
    .prepare("PRAGMA table_info(words)")
    .all()
    .map((column) => column.name);

  const addWordColumn = (name, ddl) => {
    if (wordColumns.includes(name)) return;
    try {
      sqlite.exec(ddl);
    } catch {
      // column already exists (e.g. added by a concurrent process)
    }
  };

  addWordColumn(
    "definition",
    "ALTER TABLE words ADD COLUMN definition TEXT NOT NULL DEFAULT ''",
  );
  addWordColumn("type", "ALTER TABLE words ADD COLUMN type TEXT NOT NULL DEFAULT ''");
  addWordColumn(
    "example",
    "ALTER TABLE words ADD COLUMN example TEXT NOT NULL DEFAULT ''",
  );
  addWordColumn(
    "forms",
    "ALTER TABLE words ADD COLUMN forms TEXT NOT NULL DEFAULT '[]'",
  );

  migrateLegacyLessons(sqlite);

  return drizzle(sqlite, { schema });
}

export const db = globalThis.__englishDb ?? (globalThis.__englishDb = createDb());
