"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, RefreshCw, X } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import WordInfo from "@/components/WordInfo";
import { useToast } from "@/components/ToastProvider";
import { findCharacter } from "@/lib/characters";
import { reactionLine, stageCharacter } from "@/lib/reactions";

const STAGE_LABELS = {
  vocabulary: "Vocabulary",
  translations: "Translation",
  sentences: "Sentences",
  reading: "Reading",
};

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeSentence(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function acceptedForms(blank) {
  if (Array.isArray(blank?.accept) && blank.accept.length > 0) return blank.accept;
  return [blank?.answer ?? blank?.word ?? ""].filter(Boolean);
}

function isAccepted(answer, blank) {
  const norm = normalize(answer);
  if (!norm) return false;
  return acceptedForms(blank).some((form) => normalize(form) === norm);
}

function speakerSides(dialogue) {
  const order = [];
  for (const line of dialogue) {
    if (!order.includes(line.speaker)) order.push(line.speaker);
  }
  return dialogue.map((line) =>
    order.indexOf(line.speaker) === 0 ? "left" : "right",
  );
}

function Dialogue({ dialogue, values, onChange, disabled, feedback }) {
  const sides = speakerSides(dialogue);
  let blankIndex = 0;

  return (
    <div className="chat">
      {dialogue.map((line, i) => {
        const character = findCharacter(line.speaker);
        const color = character?.color ?? "var(--accent)";
        const parts = String(line.text).split("______");

        return (
          <div className={`chat-line ${sides[i]}`} key={i}>
            <div className="chat-avatar" style={{ borderColor: color }}>
              {character?.avatar ? (
                <img src={character.avatar} alt={line.speaker} />
              ) : (
                line.speaker.charAt(0)
              )}
            </div>
            <div className="chat-body">
              <span className="chat-speaker" style={{ color }}>
                {line.speaker}
              </span>
              <div className="chat-bubble">
                {parts.map((part, j) => {
                  const isBlank = j < parts.length - 1;
                  const index = isBlank ? blankIndex++ : -1;
                  const wrong = feedback?.[index] && !feedback[index].correct;
                  return (
                    <span key={j}>
                      {part}
                      {isBlank && (
                        <>
                          <input
                            className={`blank-input ${wrong ? "wrong" : ""}`}
                            value={values[index] ?? ""}
                            onChange={(e) => onChange(index, e.target.value)}
                            disabled={disabled}
                            autoFocus={index === 0}
                            aria-label={`Missing word ${index + 1}`}
                            style={{
                              width: `${Math.max(5, (values[index]?.length ?? 0) + 1)}ch`,
                            }}
                          />
                          {wrong && (
                            <span className="blank-fix">
                              {feedback[index].expected}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Mascot({ characterId, line }) {
  const character = findCharacter(characterId);
  const color = character?.color ?? "var(--accent)";
  return (
    <div className="mascot-line">
      <div className="chat-avatar" style={{ borderColor: color }}>
        {character?.avatar ? (
          <img src={character.avatar} alt={character?.name ?? characterId} />
        ) : (
          characterId.charAt(0)
        )}
      </div>
      <div className="mascot-bubble">
        <span className="chat-speaker" style={{ color }}>
          {character?.name ?? characterId}
        </span>
        <span>{line}</span>
      </div>
    </div>
  );
}

function SentenceBuilder({ task, selected, onChange, disabled, feedback }) {
  const selectedSet = new Set(selected);
  const placed = selected.map((index) => ({ index, text: task.blocks[index] }));
  const bank = task.blocks
    .map((text, index) => ({ index, text }))
    .filter((block) => !selectedSet.has(block.index));

  return (
    <div className="sentence-task">
      <div className="chat-bubble prompt-bubble">{task.prompt}</div>

      <div
        className={`sentence-line ${
          disabled && feedback ? (feedback.correct ? "ok" : "err") : ""
        }`}
      >
        {placed.length === 0 ? (
          <span className="hint">Tap the words below to build the sentence.</span>
        ) : (
          placed.map((block) => (
            <button
              type="button"
              key={block.index}
              className="block placed"
              onClick={() =>
                onChange(selected.filter((value) => value !== block.index))
              }
              disabled={disabled}
            >
              {block.text}
            </button>
          ))
        )}
      </div>

      <div className="block-bank">
        {bank.map((block) => (
          <button
            type="button"
            key={block.index}
            className="block"
            onClick={() => onChange([...selected, block.index])}
            disabled={disabled}
          >
            {block.text}
          </button>
        ))}
      </div>

      {!disabled && selected.length > 0 && (
        <button type="button" className="clear-blocks" onClick={() => onChange([])}>
          Clear
        </button>
      )}

      {disabled && feedback && (
        <p className={`msg ${feedback.correct ? "ok" : "err"}`}>
          {feedback.correct ? (
            <>
              <Check size={14} /> Correct
            </>
          ) : (
            <>
              <X size={14} /> Right answer: &ldquo;{task.answer}&rdquo;
            </>
          )}
        </p>
      )}
    </div>
  );
}

export default function LessonPage() {
  const { id } = useParams();
  const { toast } = useToast();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blankAnswers, setBlankAnswers] = useState([]);
  const [translationAnswers, setTranslationAnswers] = useState([]);
  const [sentenceAnswers, setSentenceAnswers] = useState([]);
  const [readingAnswers, setReadingAnswers] = useState([]);
  const [stageIndex, setStageIndex] = useState(0);
  const [stageChecked, setStageChecked] = useState(false);
  const [vocabFeedback, setVocabFeedback] = useState(null);
  const [sentenceFeedback, setSentenceFeedback] = useState(null);
  const [aiFeedback, setAiFeedback] = useState([]);
  const [mascot, setMascot] = useState("");
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const resultsRef = useRef([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/lessons/${id}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLesson(data.lesson);
      setLoading(false);
    })();
  }, [id]);

  const content = lesson?.content;
  const vocabulary = content?.vocabulary;
  const blanks = vocabulary?.blanks ?? [];
  const translations = content?.translations ?? [];
  const sentences = content?.sentences ?? [];
  const reading = content?.reading ?? null;

  const stages = [];
  if (blanks.length) stages.push("vocabulary");
  if (translations.length) stages.push("translations");
  if (sentences.length) stages.push("sentences");
  if (reading) stages.push("reading");

  const wordById = new Map(
    (lesson?.words ?? []).map((word) => [Number(word.id), word]),
  );

  function setBlank(index, value) {
    setBlankAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function setTranslation(index, value) {
    setTranslationAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function setReading(index, value) {
    setReadingAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function setSentence(index, next) {
    setSentenceAnswers((prev) => {
      const copy = prev.map((value) => value ?? []);
      copy[index] = next;
      return copy;
    });
  }

  async function evaluate(items) {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      return items.map(() => ({ correct: false, feedback: "Evaluation failed." }));
    }
    const data = await res.json();
    return data.results ?? [];
  }

  function stageFilled(stage) {
    if (stage === "vocabulary") {
      return blanks.every((_, i) => (blankAnswers[i] ?? "").trim());
    }
    if (stage === "translations") {
      return translations.every((_, i) => (translationAnswers[i] ?? "").trim());
    }
    if (stage === "sentences") {
      return sentences.every((task, i) => {
        const needed = String(task.answer ?? "")
          .split(/\s+/)
          .filter(Boolean).length;
        return (sentenceAnswers[i]?.length ?? 0) >= needed;
      });
    }
    if (stage === "reading") {
      return reading.questions.every((_, i) => (readingAnswers[i] ?? "").trim());
    }
    return true;
  }

  async function checkStage() {
    const stage = stages[stageIndex];

    if (!stageFilled(stage)) {
      toast("Fill in all the answers first", "info");
      return;
    }

    if (stage === "vocabulary") {
      const feedback = blanks.map((blank, i) => ({
        type: "vocabulary",
        wordId: blank.wordId,
        label: blank.word,
        answer: blankAnswers[i] ?? "",
        expected: blank.answer ?? blank.word,
        correct: isAccepted(blankAnswers[i], blank),
      }));
      setVocabFeedback(feedback);
      resultsRef.current = [...resultsRef.current, ...feedback];
      setMascot(
        reactionLine(
          stageCharacter(stageIndex),
          feedback.filter((item) => item.correct).length,
          feedback.length,
          stageIndex,
        ),
      );
      setStageChecked(true);
      return;
    }

    if (stage === "sentences") {
      const feedback = sentences.map((task, i) => {
        const answer = (sentenceAnswers[i] ?? [])
          .map((index) => task.blocks[index])
          .join(" ");
        return {
          type: "sentences",
          wordId: task.wordId,
          label: task.word,
          answer,
          expected: task.answer,
          correct: normalizeSentence(answer) === normalizeSentence(task.answer),
        };
      });
      setSentenceFeedback(feedback);
      resultsRef.current = [...resultsRef.current, ...feedback];
      setMascot(
        reactionLine(
          stageCharacter(stageIndex),
          feedback.filter((item) => item.correct).length,
          feedback.length,
          stageIndex,
        ),
      );
      setStageChecked(true);
      return;
    }

    const source = stage === "reading" ? reading.questions : translations;
    const answers = stage === "reading" ? readingAnswers : translationAnswers;
    const items = source.map((item, i) => ({
      type: stage === "reading" ? "reading" : "translation",
      prompt: stage === "reading" ? item.question : item.prompt,
      reference: item.reference,
      answer: answers[i] ?? "",
    }));

    setBusy(true);
    const evaluated = items.length ? await evaluate(items) : [];
    setBusy(false);
    setAiFeedback(evaluated);

    const feedback = source.map((item, i) => ({
      type: stage === "reading" ? "reading" : "translation",
      wordId: item.wordId,
      label: stage === "reading" ? item.question : item.word,
      answer: answers[i] ?? "",
      expected: item.reference,
      correct: Boolean(evaluated[i]?.correct),
    }));

    resultsRef.current = [...resultsRef.current, ...feedback];
    setMascot(
      reactionLine(
        stageCharacter(stageIndex),
        feedback.filter((item) => item.correct).length,
        feedback.length,
        stageIndex,
      ),
    );
    setStageChecked(true);
  }

  async function finish() {
    setBusy(true);
    const res = await fetch(`/api/lessons/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: resultsRef.current }),
    });
    setBusy(false);

    if (!res.ok) {
      toast("Failed to save lesson result", "error");
      return;
    }

    const data = await res.json();
    setSummary(data.result);
    setMascot(reactionLine("aiko", data.result.correct, data.result.total, 1));
    toast(
      `Lesson done: ${data.result.correct}/${data.result.total}`,
      data.result.correct === data.result.total ? "success" : "info",
    );
  }

  async function nextStage() {
    if (stageIndex < stages.length - 1) {
      setStageIndex((i) => i + 1);
      setStageChecked(false);
      setAiFeedback([]);
      setSentenceFeedback(null);
      setMascot("");
      return;
    }
    await finish();
  }

  function restart() {
    resultsRef.current = [];
    setBlankAnswers([]);
    setTranslationAnswers([]);
    setSentenceAnswers([]);
    setReadingAnswers([]);
    setStageIndex(0);
    setStageChecked(false);
    setVocabFeedback(null);
    setSentenceFeedback(null);
    setAiFeedback([]);
    setMascot("");
    setSummary(null);
  }

  if (loading) {
    return (
      <main className="wrap">
        <p className="hint">Loading lesson…</p>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="wrap">
        <p className="hint">Lesson not found.</p>
        <Link href="/" className="link">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  const hasContent = stages.length > 0;
  const isMistakes = lesson.category === "mistakes";
  const stage = stages[stageIndex];

  return (
    <main className="wrap">
      <header className="head">
        <h1>
          {isMistakes ? "Mistakes lesson" : "Lesson"} · {lesson.studyDate}
        </h1>
        <Link href="/" className="link">
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </header>

      <div className="target-words">
        <span className="target-label">Target words</span>
        <ul className="word-chips">
          {lesson.words.map((word) => (
            <li key={word.id} className="word-chip">
              <WordInfo word={word} />
              <span className="chip-level">L{word.level}</span>
            </li>
          ))}
        </ul>
      </div>

      {!hasContent ? (
        <Card>
          <p className="muted">
            No exercises were generated (AI unavailable). Try generating the
            lesson again.
          </p>
        </Card>
      ) : summary ? (
        <Card>
          <div className="block-head">
            <h2>
              {isMistakes && summary.mistakes.length === 0
                ? "Mistakes lesson passed"
                : "Lesson complete"}
            </h2>
          </div>
          <p className="muted">
            {isMistakes && summary.mistakes.length === 0
              ? "All clear — the practiced words went up a level."
              : `You got ${summary.correct} of ${summary.total} correct.`}
          </p>
          {mascot && <Mascot characterId="aiko" line={mascot} />}
          {summary.mistakes.length > 0 && (
            <div className="mistakes">
              <p className="strong">Mistakes</p>
              <ul>
                {summary.mistakes.map((mistake, i) => (
                  <li key={i}>
                    <span className="strong">{mistake.label}</span> — your
                    answer: &ldquo;{mistake.answer || "—"}&rdquo;
                    {mistake.expected ? (
                      <> · right: &ldquo;{mistake.expected}&rdquo;</>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="row-actions">
            <Button onClick={restart}>
              <RefreshCw size={16} />
              Pass again
            </Button>
            <Link href="/" className="btn primary">
              Back to dashboard
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {stages.length > 1 && (
            <div className="steps">
              {stages.map((key, i) => (
                <span
                  key={key}
                  className={`step ${i === stageIndex ? "active" : ""} ${
                    i < stageIndex ? "done" : ""
                  }`}
                >
                  {STAGE_LABELS[key]}
                </span>
              ))}
            </div>
          )}

          {stage === "vocabulary" && (
            <Card>
              <div className="block-head">
                <h2>Fill in the blanks</h2>
              </div>
              <Dialogue
                dialogue={vocabulary.dialogue}
                values={blankAnswers}
                onChange={setBlank}
                disabled={stageChecked}
                feedback={vocabFeedback}
              />
              {stageChecked &&
                vocabFeedback?.some((item) => !item.correct) && (
                  <div className="corrections">
                    <p className="strong">Corrections</p>
                    <ul>
                      {vocabFeedback
                        .filter((item) => !item.correct)
                        .map((item, i) => {
                          const record = wordById.get(Number(item.wordId));
                          return (
                            <li key={i}>
                              <span className="strong">{item.expected}</span>
                              {record?.definition ? ` — ${record.definition}` : ""}
                              {record?.example ? (
                                <span className="word-tip-ex">
                                  {" "}
                                  &ldquo;{record.example}&rdquo;
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
            </Card>
          )}

          {stage === "translations" && (
            <Card>
              <div className="block-head">
                <h2>Translate into English</h2>
              </div>
              {translations.map((translation, i) => (
                <div className="translation-item" key={i}>
                  <div className="chat-bubble prompt-bubble">
                    {translation.prompt}
                  </div>
                  <Input
                    placeholder="Your English translation…"
                    value={translationAnswers[i] ?? ""}
                    onChange={(e) => setTranslation(i, e.target.value)}
                    disabled={stageChecked}
                    className="translation"
                  />
                  {stageChecked && aiFeedback[i] && (
                    <p className={`msg ${aiFeedback[i].correct ? "ok" : "err"}`}>
                      {aiFeedback[i].correct ? (
                        <>
                          <Check size={14} /> Correct
                          {aiFeedback[i].feedback
                            ? ` — ${aiFeedback[i].feedback}`
                            : ""}
                        </>
                      ) : (
                        <>
                          <X size={14} /> Right answer: &ldquo;
                          {translation.reference}&rdquo;
                          {aiFeedback[i].feedback
                            ? ` — ${aiFeedback[i].feedback}`
                            : ""}
                        </>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </Card>
          )}

          {stage === "sentences" && (
            <Card>
              <div className="block-head">
                <h2>Build the sentence</h2>
              </div>
              {sentences.map((task, i) => (
                <SentenceBuilder
                  key={i}
                  task={task}
                  selected={sentenceAnswers[i] ?? []}
                  onChange={(next) => setSentence(i, next)}
                  disabled={stageChecked}
                  feedback={sentenceFeedback?.[i]}
                />
              ))}
            </Card>
          )}

          {stage === "reading" && (
            <Card>
              <div className="block-head">
                <h2>{reading.title}</h2>
              </div>
              <p className="reading-passage">{reading.passage}</p>
              <div className="reading-questions">
                {reading.questions.map((question, i) => {
                  const feedback = aiFeedback[i];
                  return (
                    <div className="reading-question" key={i}>
                      <label htmlFor={`q-${i}`}>
                        {i + 1}. {question.question}
                      </label>
                      <Input
                        id={`q-${i}`}
                        value={readingAnswers[i] ?? ""}
                        onChange={(e) => setReading(i, e.target.value)}
                        disabled={stageChecked}
                        placeholder="Your answer…"
                      />
                      {stageChecked && feedback && (
                        <p className={`msg ${feedback.correct ? "ok" : "err"}`}>
                          {feedback.correct ? (
                            <>
                              <Check size={14} /> Correct
                              {feedback.feedback ? ` — ${feedback.feedback}` : ""}
                            </>
                          ) : (
                            <>
                              <X size={14} /> Right answer: &ldquo;
                              {question.reference}&rdquo;
                              {feedback.feedback ? ` — ${feedback.feedback}` : ""}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {stageChecked && mascot && (
            <Mascot characterId={stageCharacter(stageIndex)} line={mascot} />
          )}

          <div className="row-actions">
            {!stageChecked ? (
              <Button variant="primary" onClick={checkStage} disabled={busy}>
                <Check size={16} />
                {busy
                  ? "Checking…"
                  : stageIndex === stages.length - 1
                    ? "Check lesson"
                    : "Check"}
              </Button>
            ) : (
              <Button variant="primary" onClick={nextStage} disabled={busy}>
                {stageIndex < stages.length - 1 ? "Continue" : "Finish lesson"}
                <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
