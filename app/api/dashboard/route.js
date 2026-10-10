import {
  getLastLesson,
  getTodayLesson,
  parseLesson,
  wordsToLearn,
} from "@/lib/lessons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const words = wordsToLearn().map((word) => ({
    id: word.id,
    word: word.word,
    level: word.level,
    lastCheckedAt: word.lastCheckedAt,
  }));

  return Response.json({
    wordsToLearn: words,
    todayLesson: parseLesson(getTodayLesson()),
    lastLesson: parseLesson(getLastLesson()),
  });
}
