import {
  getLastLesson,
  getPendingMistakesLessons,
  getTodayLesson,
  parseForms,
  parseLesson,
  wordsToLearn,
} from "@/lib/lessons";
import { DIFFICULTIES, getDifficulty, suggestedDifficulty } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const words = wordsToLearn().map((word) => ({
    id: word.id,
    word: word.word,
    level: word.level,
    lastCheckedAt: word.lastCheckedAt,
    definition: word.definition,
    type: word.type,
    example: word.example,
    forms: parseForms(word.forms),
  }));

  return Response.json({
    wordsToLearn: words,
    todayLesson: parseLesson(getTodayLesson()),
    lastLesson: parseLesson(getLastLesson()),
    mistakesLessons: getPendingMistakesLessons(5).map(parseLesson),
    difficulty: {
      value: getDifficulty(),
      suggested: suggestedDifficulty(),
      options: DIFFICULTIES,
    },
  });
}
