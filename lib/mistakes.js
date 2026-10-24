import { db } from "./db";
import { localDateString } from "./lessons";
import { lessons } from "./schema";

const BLANK = "______";

function dedupeNumbers(list) {
  const set = new Set();
  for (const value of list) {
    if (value != null && Number.isFinite(Number(value))) set.add(Number(value));
  }
  return [...set];
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Rebuilds the lesson-content shape from the source lesson's stored content,
// keeping only the tasks the learner failed. Returns { content, wordIds } or null.
export function buildMistakesContent(content, results) {
  if (!content) return null;

  const list = Array.isArray(results) ? results : [];

  const failedBlankWordIds = new Set();
  const failedTranslationRefs = new Set();
  const failedTranslationWords = new Set();
  const failedSentenceAnswers = new Set();
  const failedSentenceWords = new Set();
  const failedReadingQuestions = new Set();
  const levelWordIds = [];

  for (const item of list) {
    if (!item || item.correct) continue;

    if (item.type === "vocabulary") {
      if (item.wordId != null) {
        failedBlankWordIds.add(Number(item.wordId));
        levelWordIds.push(item.wordId);
      }
    } else if (item.type === "translation") {
      if (item.expected) failedTranslationRefs.add(String(item.expected));
      if (item.label) failedTranslationWords.add(String(item.label));
      if (item.wordId != null) levelWordIds.push(item.wordId);
    } else if (item.type === "sentences") {
      if (item.expected) failedSentenceAnswers.add(String(item.expected));
      if (item.label) failedSentenceWords.add(String(item.label));
      if (item.wordId != null) levelWordIds.push(item.wordId);
    } else if (item.type === "reading") {
      if (item.label) failedReadingQuestions.add(String(item.label));
    }
  }

  const sourceVocab = content.vocabulary ?? { dialogue: [], blanks: [] };
  const sourceBlanks = Array.isArray(sourceVocab.blanks) ? sourceVocab.blanks : [];
  const sourceDialogue = Array.isArray(sourceVocab.dialogue) ? sourceVocab.dialogue : [];

  const failedBlanks = [];
  let blankIndex = 0;

  const rebuiltDialogue = sourceDialogue.map((line) => {
    const text = String(line?.text ?? "");
    const parts = text.split(BLANK);
    if (parts.length === 1) {
      return { speaker: line?.speaker ?? "Narrator", text };
    }

    let out = parts[0];
    for (let i = 1; i < parts.length; i += 1) {
      const blank = sourceBlanks[blankIndex];
      const failed = blank && failedBlankWordIds.has(Number(blank.wordId));
      if (failed) {
        failedBlanks.push({
          wordId: blank.wordId,
          word: blank.word,
          answer: blank.answer,
          accept: blank.accept,
        });
        out += BLANK;
      } else {
        out += blank?.answer ?? blank?.word ?? "";
      }
      out += parts[i];
      blankIndex += 1;
    }

    return { speaker: line?.speaker ?? "Narrator", text: out };
  });

  const translations = (
    Array.isArray(content.translations) ? content.translations : []
  ).filter(
    (translation) =>
      failedTranslationRefs.has(String(translation.reference)) ||
      failedTranslationWords.has(String(translation.word)),
  );

  const sentences = (
    Array.isArray(content.sentences) ? content.sentences : []
  ).filter(
    (sentence) =>
      failedSentenceAnswers.has(String(sentence.answer)) ||
      failedSentenceWords.has(String(sentence.word)),
  );

  let reading = null;
  if (content.reading && Array.isArray(content.reading.questions)) {
    const questions = content.reading.questions.filter((question) =>
      failedReadingQuestions.has(String(question.question)),
    );
    if (questions.length > 0) reading = { ...content.reading, questions };
  }

  if (
    failedBlanks.length === 0 &&
    translations.length === 0 &&
    sentences.length === 0 &&
    !reading
  ) {
    return null;
  }

  return {
    content: {
      vocabulary: { dialogue: rebuiltDialogue, blanks: failedBlanks },
      translations,
      sentences,
      reading,
    },
    wordIds: dedupeNumbers(levelWordIds),
  };
}

export function createMistakesLesson(sourceLesson, results) {
  if (!sourceLesson) return null;

  const built = buildMistakesContent(
    parseJson(sourceLesson.exercisesJson, null),
    results,
  );
  if (!built) return null;

  const sourceWords = parseJson(sourceLesson.wordsJson, []);
  const wordIdSet = new Set(built.wordIds);
  const words = sourceWords.filter((word) => wordIdSet.has(Number(word.id)));

  return db
    .insert(lessons)
    .values({
      studyDate: localDateString(),
      status: "generated",
      category: "mistakes",
      sourceLessonId: sourceLesson.id,
      wordsJson: JSON.stringify(words),
      exercisesJson: JSON.stringify(built.content),
    })
    .returning()
    .get();
}
