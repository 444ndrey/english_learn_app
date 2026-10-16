import { eq } from "drizzle-orm";
import { generateLessonContent } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  getLesson,
  getTodayLesson,
  localDateString,
  parseLesson,
  wordsToLearn,
} from "@/lib/lessons";
import { lessons } from "@/lib/schema";
import { getDifficulty } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const regenerate = Boolean(body?.regenerate);

  // Reuse today's ready lesson unless the caller explicitly wants a fresh one.
  // This avoids redundant AI calls on double-clicks and page reloads.
  if (!regenerate) {
    const existing = getTodayLesson();
    if (existing?.exercisesJson) {
      return Response.json({ lesson: parseLesson(existing), aiError: null });
    }
  }

  const selected = wordsToLearn();

  if (selected.length === 0) {
    return Response.json(
      { error: "No words to learn yet. Add words in Vocabulary first." },
      { status: 400 },
    );
  }

  const snapshot = selected.map((word) => ({
    id: word.id,
    word: word.word,
    level: word.level,
  }));

  const created = db
    .insert(lessons)
    .values({
      studyDate: localDateString(),
      status: "generated",
      category: "regular",
      wordsJson: JSON.stringify(snapshot),
    })
    .returning()
    .get();

  let aiError = null;
  try {
    const exercises = await generateLessonContent(snapshot, {
      difficulty: getDifficulty(),
    });
    db.update(lessons)
      .set({ exercisesJson: JSON.stringify(exercises) })
      .where(eq(lessons.id, created.id))
      .run();
  } catch (err) {
    aiError = err.message;
  }

  return Response.json(
    { lesson: parseLesson(getLesson(created.id)), aiError },
    { status: 201 },
  );
}
