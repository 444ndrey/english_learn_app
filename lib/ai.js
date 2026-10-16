import charactersData from "@/data/characters.json";

const API_URL =
  process.env.DEEPSEEK_API_URL ||
  process.env.VITE_DEEPSEEK_API_URL ||
  "https://api.deepseek.com/chat/completions";
const API_KEY =
  process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY || "";
const MODEL =
  process.env.DEEPSEEK_MODEL || process.env.VITE_DEEPSEEK_MODEL || "deepseek-chat";

const BLANK = "______";
const TRANSLATION_COUNT = 3;
const READING_QUESTIONS = 3;

function lc(value) {
  return String(value ?? "").trim().toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mascotList() {
  return charactersData.characters
    .map((c) => `${c.name} (${c.personality.join(", ")})`)
    .join("; ");
}

async function callDeepSeek(messages, { temperature = 0.8 } = {}) {
  if (!API_KEY) throw new Error("DeepSeek API key is not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: { type: "json_object" },
        temperature,
        max_tokens: 8000,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI request failed (${response.status}) ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");

  return parseJson(content);
}

function parseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    // fall through to best-effort extraction
  }

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(content.slice(start, end + 1));
    } catch {
      // fall through
    }
  }

  throw new Error("AI returned invalid JSON");
}

function buildGenerationMessages(words, { difficulty } = {}) {
  const system =
    "You are an English lesson generator for a personal learning app. " +
    "You create vocabulary, translation and reading exercises at the learner's level.";

  const targets = words.map((w) => `- ${w.word} (level ${w.level})`).join("\n");
  const difficultyLine = difficulty
    ? `\nTarget the learner's English level: ${difficulty} (CEFR). Calibrate vocabulary, grammar and sentence complexity accordingly.`
    : "";

  const user = `Build one lesson that practices these target words:
${targets}
${difficultyLine}
The lesson has three parts:

1. "vocabulary": ONE single dialogue (4-8 lines) between characters from: ${mascotList()}.
   - It must naturally use EVERY target word exactly once.
   - Replace each target word with "______" in the dialogue text, using the grammatical form the sentence needs.
   - Provide a "blanks" array with one entry per "______", IN THE SAME ORDER they appear in the dialogue:
       { "word": "the target word", "answer": "the exact form used in the sentence", "accept": ["answer", "base form", "common inflections"] }
   - Alternate the speakers so it reads like a real conversation.

2. "translations": exactly ${TRANSLATION_COUNT} short Russian sentences to translate into English.
   - Each sentence must naturally use one of the target words.
   - Include "word" (the target word used) and the English "reference".

3. "reading": a short English passage (4-6 sentences) that naturally uses the target words,
   plus exactly ${READING_QUESTIONS} comprehension questions in English, each with a "reference" answer
   and "word" (the target word that question focuses on).

Return JSON only, no markdown, in this exact shape:
{
  "vocabulary": {
    "dialogue": [ { "speaker": "Name", "text": "a natural line with ______ where a target word goes" } ],
    "blanks": [ { "word": "target", "answer": "used form", "accept": ["used form", "base form"] } ]
  },
  "translations": [
    { "word": "target", "prompt": "Russian sentence", "reference": "English sentence" }
  ],
  "reading": {
    "title": "short title",
    "passage": "English text",
    "questions": [ { "question": "question", "reference": "reference answer", "word": "target word" } ]
  }
}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function blankDialogue(dialogue, words) {
  const lines = dialogue.map((line) => ({
    speaker: String(line.speaker || "Narrator"),
    text: String(line.text),
  }));

  const blanks = [];
  const present = new Set();

  lines.forEach((line, lineIndex) => {
    const candidates = [];

    for (const word of words) {
      const re = new RegExp(`\\b${escapeRegExp(word.word)}\\b`, "gi");
      let match;
      while ((match = re.exec(line.text)) !== null) {
        candidates.push({
          index: match.index,
          length: match[0].length,
          wordId: word.id,
          word: word.word,
        });
        if (match.index === re.lastIndex) re.lastIndex += 1;
      }
    }

    candidates.sort((a, b) => a.index - b.index);

    const chosen = [];
    let lastEnd = 0;
    for (const candidate of candidates) {
      if (candidate.index >= lastEnd) {
        chosen.push(candidate);
        lastEnd = candidate.index + candidate.length;
      }
    }

    let text = line.text;
    for (let k = chosen.length - 1; k >= 0; k -= 1) {
      const candidate = chosen[k];
      text =
        text.slice(0, candidate.index) +
        BLANK +
        text.slice(candidate.index + candidate.length);
    }
    lines[lineIndex].text = text;

    for (const candidate of chosen) {
      blanks.push({
        wordId: candidate.wordId,
        word: candidate.word,
        answer: candidate.word,
        accept: [candidate.word],
      });
      present.add(candidate.word.toLowerCase());
    }
  });

  const missing = words.filter((word) => !present.has(word.word.toLowerCase()));
  if (missing.length > 0) {
    lines.push({
      speaker: "Narrator",
      text: missing.map(() => BLANK).join("   "),
    });
    for (const word of missing) {
      blanks.push({
        wordId: word.id,
        word: word.word,
        answer: word.word,
        accept: [word.word],
      });
    }
  }

  return { dialogue: lines, blanks };
}

function countBlanks(dialogue) {
  let total = 0;
  for (const line of dialogue) {
    total += (String(line.text).match(/_{3,}/g) || []).length;
  }
  return total;
}

function dedupeStrings(list) {
  const out = [];
  const seen = new Set();
  for (const value of list) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function normalizeVocabulary(raw, words) {
  const rawDialogue = Array.isArray(raw?.dialogue)
    ? raw.dialogue
    : Array.isArray(raw)
      ? (raw[0]?.dialogue ?? [])
      : [];

  let dialogue = rawDialogue
    .filter((line) => line && line.text)
    .map((line) => ({
      speaker: String(line.speaker || "Narrator"),
      text: String(line.text),
    }));

  if (dialogue.length === 0) {
    dialogue = [
      {
        speaker: "Narrator",
        text: `Fill in the missing words: ${words.map(() => BLANK).join("   ")}`,
      },
    ];
  }

  const blankCount = countBlanks(dialogue);
  const rawBlanks = Array.isArray(raw?.blanks) ? raw.blanks : [];

  // Preferred path: the AI already placed the blanks and told us the used form.
  if (rawBlanks.length > 0 && rawBlanks.length === blankCount) {
    const used = new Set();

    const blanks = rawBlanks.map((entry) => {
      const accept = Array.isArray(entry?.accept)
        ? entry.accept
        : typeof entry?.accept === "string"
          ? entry.accept.split(",")
          : [];
      const names = [entry?.word, entry?.answer, ...accept].map(lc);

      let target = words.find((w) => !used.has(w.id) && names.includes(lc(w.word)));
      if (!target) target = words.find((w) => !used.has(w.id));
      if (target) used.add(target.id);

      const answer = String(entry?.answer ?? target?.word ?? entry?.word ?? "").trim();
      return {
        wordId: target?.id ?? null,
        word: target?.word ?? String(entry?.word ?? answer),
        answer,
        accept: dedupeStrings([answer, target?.word, ...accept]),
      };
    });

    const allCovered = words.every((w) => used.has(w.id));
    return { dialogue, blanks, valid: allCovered };
  }

  const fallback = blankDialogue(dialogue, words);
  return { ...fallback, valid: false };
}

function normalizeTranslations(rawList, words) {
  const list = Array.isArray(rawList) ? rawList : [];

  return list
    .filter((item) => item && item.prompt)
    .map((item, index) => {
      const word =
        words.find((w) => lc(w.word) === lc(item.word)) ??
        words[index % words.length];
      return {
        type: "translation",
        wordId: word?.id ?? null,
        word: word?.word ?? "",
        prompt: String(item.prompt),
        reference: String(item.reference ?? ""),
      };
    });
}

function normalizeReading(raw, words) {
  if (!raw || !raw.passage) return null;

  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .filter((q) => q && q.question)
    .map((q) => {
      const target = words.find((w) => lc(w.word) === lc(q.word));
      return {
        question: String(q.question),
        reference: String(q.reference ?? ""),
        wordId: target?.id ?? null,
        word: target?.word ?? "",
      };
    });

  if (questions.length === 0) return null;

  return {
    type: "reading",
    title: String(raw.title ?? "Reading"),
    passage: String(raw.passage),
    questions,
    words: words.map((w) => w.word),
  };
}

function normalizeContent(parsed, words) {
  const vocabulary = normalizeVocabulary(parsed?.vocabulary, words);
  return {
    vocabulary: { dialogue: vocabulary.dialogue, blanks: vocabulary.blanks },
    translations: normalizeTranslations(parsed?.translations, words),
    reading: normalizeReading(parsed?.reading, words),
    valid: vocabulary.valid,
  };
}

function publicContent(content) {
  return {
    vocabulary: content.vocabulary,
    translations: content.translations,
    reading: content.reading,
  };
}

const MAX_GENERATION_ATTEMPTS = 3;

export async function generateLessonContent(words, options = {}) {
  let fallback = null;

  // Retry when the AI drops a target word or misaligns its blanks, so the
  // learner never gets a lesson with a dangling "Narrator: ______" line.
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const parsed = await callDeepSeek(buildGenerationMessages(words, options));
    const content = normalizeContent(parsed, words);

    if (content.valid) return publicContent(content);
    fallback = content;
  }

  return publicContent(fallback);
}

function normalizeWordDetails(parsed, list) {
  const raw = Array.isArray(parsed?.words)
    ? parsed.words
    : Array.isArray(parsed)
      ? parsed
      : [];

  return list.map((word, index) => {
    const match =
      raw.find((entry) => lc(entry?.word) === lc(word)) ?? raw[index] ?? {};

    let forms = [];
    if (Array.isArray(match.forms)) {
      forms = match.forms.map((form) => String(form ?? "").trim()).filter(Boolean);
    } else if (typeof match.forms === "string") {
      forms = match.forms
        .split(",")
        .map((form) => form.trim())
        .filter(Boolean);
    }

    return {
      word,
      definition: String(match.definition ?? "").trim(),
      type: String(match.type ?? "").trim(),
      example: String(match.example ?? "").trim(),
      forms,
    };
  });
}

export async function generateWordDetails(words) {
  const list = (Array.isArray(words) ? words : [words])
    .map((word) => String(word ?? "").trim())
    .filter(Boolean);

  if (list.length === 0) return [];

  const system =
    "You are a learner's English dictionary. Explain words simply for a student. " +
    "Return JSON only.";

  const user = `For each word, give a simple learner-friendly English definition, its part of speech (type),
one short natural example sentence, and its inflected forms. For verbs include third person singular, past, past participle and -ing. For nouns include the plural. If a word has no other forms, return an empty array.

Words: ${JSON.stringify(list)}

Return this exact shape, with one entry per word in the same order:
{ "words": [ { "word": "the word", "definition": "simple definition", "type": "noun|verb|adjective|adverb|...", "example": "a short sentence using the word", "forms": ["form1", "form2"] } ] }`;

  const parsed = await callDeepSeek(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.3 },
  );

  return normalizeWordDetails(parsed, list);
}

function fallbackEvaluation(items) {
  return items.map((item) => ({
    correct: lc(item.answer) !== "" && lc(item.answer) === lc(item.reference),
    feedback: "AI unavailable — compared with the reference answer.",
  }));
}

export async function evaluateAnswers(items) {
  if (!API_KEY) return fallbackEvaluation(items);

  const system =
    "You are a strict but fair English teacher. Evaluate the learner's answers. " +
    "Accept any natural, grammatically correct variant that matches the expected meaning. " +
    "Return JSON only.";

  const user = `Evaluate each learner answer. For translations, the prompt is Russian and the reference is one correct English answer. For reading, judge whether the answer is a correct response to the question.

Items:
${JSON.stringify(items, null, 2)}

Return this exact shape, with results in the same order as the items:
{ "results": [ { "correct": true, "feedback": "short feedback" } ] }`;

  try {
    const parsed = await callDeepSeek(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.2 },
    );

    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    return items.map((item, index) => ({
      correct: Boolean(results[index]?.correct),
      feedback: String(results[index]?.feedback ?? ""),
    }));
  } catch {
    return fallbackEvaluation(items);
  }
}
