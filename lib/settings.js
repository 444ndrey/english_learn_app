import { eq, sql } from "drizzle-orm";
import { characters } from "./characters";
import { db } from "./db";
import { settings, words } from "./schema";

export const DIFFICULTIES = ["A1", "A2", "B1", "B2"];

const DIFFICULTY_KEY = "difficulty";
const CHARACTERS_KEY = "characters";

function allCharacterIds() {
  return characters.map((character) => character.id);
}

export function getSetting(key, fallback = "") {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? fallback;
}

export function setSetting(key, value) {
  db.insert(settings)
    .values({ key, value: String(value) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: String(value) },
    })
    .run();
}

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

export function getDifficulty() {
  const stored = getSetting(DIFFICULTY_KEY);
  return DIFFICULTIES.includes(stored) ? stored : suggestedDifficulty();
}

export function getEnabledCharacterIds() {
  const stored = getSetting(CHARACTERS_KEY);
  const ids = allCharacterIds();
  if (!stored) return ids;

  try {
    const parsed = JSON.parse(stored);
    const filtered = Array.isArray(parsed)
      ? parsed.filter((id) => ids.includes(id))
      : [];
    return filtered.length >= 2 ? filtered : ids;
  } catch {
    return ids;
  }
}

export function setEnabledCharacterIds(list) {
  setSetting(CHARACTERS_KEY, JSON.stringify(list));
}

export function getSettingsPayload() {
  const enabled = new Set(getEnabledCharacterIds());
  return {
    difficulty: {
      value: getDifficulty(),
      suggested: suggestedDifficulty(),
      options: DIFFICULTIES,
    },
    characters: characters.map((character) => ({
      id: character.id,
      name: character.name,
      description: character.bio ?? "",
      enabled: enabled.has(character.id),
    })),
  };
}

export function saveSettings(body) {
  if (typeof body?.difficulty === "string") {
    if (!DIFFICULTIES.includes(body.difficulty)) {
      throw new Error("Unsupported difficulty");
    }
    setSetting(DIFFICULTY_KEY, body.difficulty);
  }

  if (body?.characters !== undefined) {
    if (!Array.isArray(body.characters)) {
      throw new Error("characters must be an array");
    }
    const ids = allCharacterIds();
    const selected = [...new Set(body.characters.filter((id) => ids.includes(id)))];
    if (selected.length < 2) {
      throw new Error("Enable at least two characters");
    }
    setEnabledCharacterIds(selected);
  }

  return getSettingsPayload();
}
