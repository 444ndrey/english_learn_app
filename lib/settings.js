import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { settings, words } from "./schema";

export const DIFFICULTIES = ["A1", "A2", "B1", "B2"];

const DIFFICULTY_KEY = "difficulty";

// A rough CEFR hint derived from the learner's current spaced-repetition levels.
export function suggestedDifficulty() {
  const row = db
    .select({ avg: sql`avg(level)`, total: sql`count(*)` })
    .from(words)
    .get();

  const total = Number(row?.total ?? 0);
  if (total === 0) return "B1";

  const avg = Number(row?.avg ?? 1);
  if (avg < 1.8) return "A2";
  if (avg < 3.2) return "B1";
  return "B2";
}

export function getStoredDifficulty() {
  const row = db
    .select()
    .from(settings)
    .where(eq(settings.key, DIFFICULTY_KEY))
    .get();
  return row?.value ?? "";
}

export function getDifficulty() {
  const stored = getStoredDifficulty();
  return DIFFICULTIES.includes(stored) ? stored : suggestedDifficulty();
}

export function setDifficulty(value) {
  db.insert(settings)
    .values({ key: DIFFICULTY_KEY, value: String(value) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: String(value) },
    })
    .run();
}
