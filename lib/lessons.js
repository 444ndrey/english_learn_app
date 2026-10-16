import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "./db";
import { lessons, words as wordsTable } from "./schema";
import { isDue, nextReviewDate } from "./vocabulary";

export const WORDS_PER_LESSON = 5;
export const NEW_WORDS_PER_LESSON = 3;

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Priority:
//   0 — words already in learning whose next review date has been reached
//       (bigger level = higher priority)
//   1 — brand new words (never reviewed)
//   2 — words in learning whose next review date is still in the future
export function wordRank(word, now = new Date()) {
  const learning = word.lastCheckedAt != null;
  if (!learning) return 1;
  return isDue(word.lastCheckedAt, word.level, now) ? 0 : 2;
}

export function selectWordsToLearn(
  list,
  {
    limit = WORDS_PER_LESSON,
    newLimit = NEW_WORDS_PER_LESSON,
    now = new Date(),
    excludeIds = new Set(),
  } = {},
) {
  const candidates = [...list];

  candidates.sort((a, b) => {
    const rankA = wordRank(a, now);
    const rankB = wordRank(b, now);
    if (rankA !== rankB) return rankA - rankB;

    // Prefer bigger level only for words that are due for review.
    if (rankA === 0 && b.level !== a.level) return b.level - a.level;

    const aNext = nextReviewDate(a.lastCheckedAt, a.level);
    const bNext = nextReviewDate(b.lastCheckedAt, b.level);
    return (aNext ? aNext.getTime() : 0) - (bNext ? bNext.getTime() : 0);
  });

  const selected = [];
  const deferred = [];
  let newCount = 0;

  // First pass: prefer words that were not in the previous lesson (rotation)
  // and cap how many brand-new words a single lesson introduces.
  for (const word of candidates) {
    if (selected.length >= limit) break;

    const isNew = wordRank(word, now) === 1;
    if (isNew && newCount >= newLimit) continue;

    if (excludeIds.has(word.id)) {
      deferred.push(word);
      continue;
    }

    selected.push(word);
    if (isNew) newCount += 1;
  }

  // Second pass: fill remaining slots from the previous lesson's words.
  for (const word of deferred) {
    if (selected.length >= limit) break;

    const isNew = wordRank(word, now) === 1;
    if (isNew && newCount >= newLimit) continue;

    selected.push(word);
    if (isNew) newCount += 1;
  }

  return selected;
}

export function getAllWords() {
  return db.select().from(wordsTable).orderBy(wordsTable.id).all();
}

export function wordsToLearn(now = new Date()) {
  const excludeIds = new Set();
  const last = getLastLesson();
  if (last?.wordsJson) {
    try {
      for (const word of JSON.parse(last.wordsJson)) {
        if (word?.id != null) excludeIds.add(Number(word.id));
      }
    } catch {
      // ignore malformed history
    }
  }
  return selectWordsToLearn(getAllWords(), { now, excludeIds });
}

export function getLesson(id) {
  return db.select().from(lessons).where(eq(lessons.id, Number(id))).get();
}

export function getTodayLesson(now = new Date()) {
  const date = localDateString(now);
  return db
    .select()
    .from(lessons)
    .where(and(eq(lessons.studyDate, date), eq(lessons.category, "regular")))
    .orderBy(desc(lessons.id))
    .get();
}

export function getLastLesson() {
  return db
    .select()
    .from(lessons)
    .where(eq(lessons.category, "regular"))
    .orderBy(desc(lessons.id))
    .get();
}

export function getPendingMistakesLessons(limit = 5) {
  return db
    .select()
    .from(lessons)
    .where(and(eq(lessons.category, "mistakes"), ne(lessons.status, "passed")))
    .orderBy(desc(lessons.id))
    .limit(limit)
    .all();
}

export function parseLesson(lesson) {
  if (!lesson) return null;
  return {
    id: lesson.id,
    createdAt: lesson.createdAt,
    studyDate: lesson.studyDate,
    status: lesson.status,
    category: lesson.category,
    sourceLessonId: lesson.sourceLessonId,
    words: JSON.parse(lesson.wordsJson || "[]"),
    content: lesson.exercisesJson ? JSON.parse(lesson.exercisesJson) : null,
    result: lesson.resultJson ? JSON.parse(lesson.resultJson) : null,
    completedAt: lesson.completedAt,
    passedAt: lesson.passedAt,
  };
}

export function parseForms(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function withWordDetails(lesson) {
  if (!lesson || !Array.isArray(lesson.words) || lesson.words.length === 0) {
    return lesson;
  }

  const ids = lesson.words
    .map((word) => Number(word.id))
    .filter((id) => Number.isFinite(id));

  const rows = ids.length
    ? db.select().from(wordsTable).where(inArray(wordsTable.id, ids)).all()
    : [];
  const byId = new Map(rows.map((row) => [row.id, row]));

  return {
    ...lesson,
    words: lesson.words.map((word) => {
      const record = byId.get(Number(word.id));
      if (!record) return word;
      return {
        ...word,
        definition: record.definition,
        type: record.type,
        example: record.example,
        forms: parseForms(record.forms),
      };
    }),
  };
}
