import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { lessons, words as wordsTable } from "./schema";
import { isDue, nextReviewDate } from "./vocabulary";

export const WORDS_PER_LESSON = 5;

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

export function selectWordsToLearn(list, { limit = WORDS_PER_LESSON, now = new Date() } = {}) {
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

  return candidates.slice(0, limit);
}

export function getAllWords() {
  return db.select().from(wordsTable).orderBy(wordsTable.id).all();
}

export function wordsToLearn() {
  return selectWordsToLearn(getAllWords());
}

export function getLesson(id) {
  return db.select().from(lessons).where(eq(lessons.id, Number(id))).get();
}

export function getTodayLesson(now = new Date()) {
  const date = localDateString(now);
  return db
    .select()
    .from(lessons)
    .where(eq(lessons.studyDate, date))
    .orderBy(desc(lessons.id))
    .get();
}

export function getLastLesson() {
  return db.select().from(lessons).orderBy(desc(lessons.id)).get();
}

export function parseLesson(lesson) {
  if (!lesson) return null;
  return {
    id: lesson.id,
    createdAt: lesson.createdAt,
    studyDate: lesson.studyDate,
    status: lesson.status,
    words: JSON.parse(lesson.wordsJson || "[]"),
    content: lesson.exercisesJson ? JSON.parse(lesson.exercisesJson) : null,
    result: lesson.resultJson ? JSON.parse(lesson.resultJson) : null,
    completedAt: lesson.completedAt,
  };
}
