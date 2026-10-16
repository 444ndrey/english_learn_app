import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getLesson, parseLesson } from "@/lib/lessons";
import { createMistakesLesson } from "@/lib/mistakes";
import { lessons, words as wordsTable } from "@/lib/schema";
import { applyAttempt } from "@/lib/vocabulary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { id } = await params;
  const lesson = getLesson(id);

  if (!lesson) {
    return Response.json({ error: "lesson not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const results = Array.isArray(body?.results) ? body.results : [];
  const now = new Date();
  let correctCount = 0;
  const mistakes = [];

  const perWord = new Map();

  for (const item of results) {
    const correct = Boolean(item.correct);

    if (correct) {
      correctCount += 1;
    } else {
      mistakes.push({
        label: String(item.label ?? item.word ?? ""),
        answer: String(item.answer ?? ""),
        expected: String(item.expected ?? ""),
      });
    }

    if (item.wordId != null) {
      const key = Number(item.wordId);
      const prev = perWord.get(key);
      perWord.set(key, (prev ?? true) && correct);
    }
  }

  const isMistakes = lesson.category === "mistakes";
  const allCorrect = results.length > 0 && correctCount === results.length;

  // The same spacing rule applies to every lesson (including mistakes):
  // a level rises only once the word's review date has been reached, so a
  // word can never gain more than one level per day.
  for (const [wordId, correct] of perWord) {
    const record = db
      .select()
      .from(wordsTable)
      .where(eq(wordsTable.id, wordId))
      .get();
    if (!record) continue;

    db.update(wordsTable)
      .set(applyAttempt(record, correct, now))
      .where(eq(wordsTable.id, record.id))
      .run();
  }

  const result = { correct: correctCount, total: results.length, mistakes };

  const status = isMistakes ? (allCorrect ? "passed" : "failed") : "completed";

  db.update(lessons)
    .set({
      status,
      resultJson: JSON.stringify(result),
      completedAt: now.toISOString(),
      ...(isMistakes ? { passedAt: allCorrect ? now.toISOString() : null } : {}),
    })
    .where(eq(lessons.id, lesson.id))
    .run();

  // Regular lessons spawn a "mistakes" lesson. Mistakes lessons never chain.
  if (!isMistakes && mistakes.length > 0) {
    createMistakesLesson(lesson, results);
  }

  return Response.json({ lesson: parseLesson(getLesson(lesson.id)), result });
}
