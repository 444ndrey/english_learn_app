import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getLesson, parseLesson } from "@/lib/lessons";
import { lessons, words as wordsTable } from "@/lib/schema";
import { applyAttemptLevel } from "@/lib/vocabulary";

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
      const record = db
        .select()
        .from(wordsTable)
        .where(eq(wordsTable.id, Number(item.wordId)))
        .get();
      if (!record) continue;

      const level = applyAttemptLevel(record.level, record.lastCheckedAt, correct, now);
      db.update(wordsTable)
        .set({ level, lastCheckedAt: now.toISOString() })
        .where(eq(wordsTable.id, record.id))
        .run();
    }
  }

  const result = { correct: correctCount, total: results.length, mistakes };

  db.update(lessons)
    .set({
      status: "completed",
      resultJson: JSON.stringify(result),
      completedAt: now.toISOString(),
    })
    .where(eq(lessons.id, lesson.id))
    .run();

  return Response.json({ lesson: parseLesson(getLesson(lesson.id)), result });
}
