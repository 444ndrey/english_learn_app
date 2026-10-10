"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, RefreshCw, X } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import { useToast } from "@/components/ToastProvider";
import { findCharacter } from "@/lib/characters";

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
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
            <div className="chat-avatar" style={{ background: color }}>
              {line.speaker.charAt(0)}
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

export default function LessonPage() {
  const { id } = useParams();
  const { toast } = useToast();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blankAnswers, setBlankAnswers] = useState([]);
  const [translationAnswers, setTranslationAnswers] = useState([]);
  const [readingAnswers, setReadingAnswers] = useState([]);
  const [checked, setChecked] = useState(false);
  const [vocabFeedback, setVocabFeedback] = useState(null);
  const [aiFeedback, setAiFeedback] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);

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
  const translations = content?.translations ?? [];
  const reading = content?.reading ?? null;

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

  async function check() {
    const blanks = vocabulary?.blanks ?? [];
    const allFilled =
      blanks.every((_, i) => (blankAnswers[i] ?? "").trim()) &&
      translations.every((_, i) => (translationAnswers[i] ?? "").trim()) &&
      (!reading ||
        reading.questions.every((_, i) => (readingAnswers[i] ?? "").trim()));

    if (!allFilled) {
      toast("Fill in all the answers first", "info");
      return;
    }

    const vocabResult = blanks.map((blank, i) => ({
      type: "vocabulary",
      wordId: blank.wordId,
      label: blank.word,
      answer: blankAnswers[i] ?? "",
      expected: blank.word,
      correct: normalize(blankAnswers[i]) === normalize(blank.word),
    }));
    setVocabFeedback(vocabResult);

    const items = [
      ...translations.map((t, i) => ({
        type: "translation",
        prompt: t.prompt,
        reference: t.reference,
        answer: translationAnswers[i] ?? "",
      })),
      ...(reading
        ? reading.questions.map((q, i) => ({
            type: "reading",
            prompt: q.question,
            reference: q.reference,
            answer: readingAnswers[i] ?? "",
          }))
        : []),
    ];

    setBusy(true);
    const evaluated = items.length ? await evaluate(items) : [];
    setBusy(false);

    const translationResults = translations.map((t, i) => ({
      type: "translation",
      wordId: t.wordId,
      label: t.word,
      answer: translationAnswers[i] ?? "",
      expected: t.reference,
      correct: Boolean(evaluated[i]?.correct),
    }));

    const readingResults = reading
      ? reading.questions.map((q, i) => ({
          type: "reading",
          wordId: null,
          label: q.question,
          answer: readingAnswers[i] ?? "",
          expected: q.reference,
          correct: Boolean(evaluated[translations.length + i]?.correct),
        }))
      : [];

    setAiFeedback(evaluated);
    setChecked(true);

    const res = await fetch(`/api/lessons/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        results: [...vocabResult, ...translationResults, ...readingResults],
      }),
    });

    if (!res.ok) {
      toast("Failed to save lesson result", "error");
      return;
    }

    const data = await res.json();
    setSummary(data.result);
    toast(
      `Lesson done: ${data.result.correct}/${data.result.total}`,
      data.result.correct === data.result.total ? "success" : "info",
    );
  }

  function restart() {
    setBlankAnswers([]);
    setTranslationAnswers([]);
    setReadingAnswers([]);
    setChecked(false);
    setVocabFeedback(null);
    setAiFeedback([]);
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

  const hasContent = vocabulary?.dialogue?.length;

  return (
    <main className="wrap">
      <header className="head">
        <h1>Lesson · {lesson.studyDate}</h1>
        <Link href="/" className="link">
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </header>

      <div className="target-words">
        <span className="target-label">Target words</span>
        <ul className="word-chips">
          {lesson.words.map((word) => (
            <li key={word.id} className="word-chip">
              {word.word}
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
      ) : (
        <>
          <Card>
            <div className="block-head">
              <h2>Fill in the blanks</h2>
            </div>
            <Dialogue
              dialogue={vocabulary.dialogue}
              values={blankAnswers}
              onChange={setBlank}
              disabled={checked}
              feedback={vocabFeedback}
            />
          </Card>

          {translations.length > 0 && (
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
                    disabled={checked}
                  />
                  {checked && aiFeedback[i] && (
                    <p className={`msg ${aiFeedback[i].correct ? "ok" : "err"}`}>
                      {aiFeedback[i].correct ? (
                        <>
                          <Check size={14} /> Correct
                          {aiFeedback[i].feedback ? ` — ${aiFeedback[i].feedback}` : ""}
                        </>
                      ) : (
                        <>
                          <X size={14} /> Right answer: &ldquo;
                          {translation.reference}&rdquo;
                          {aiFeedback[i].feedback ? ` — ${aiFeedback[i].feedback}` : ""}
                        </>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </Card>
          )}

          {reading && (
            <Card>
              <div className="block-head">
                <h2>{reading.title}</h2>
              </div>
              <p className="reading-passage">{reading.passage}</p>
              <div className="reading-questions">
                {reading.questions.map((question, i) => {
                  const feedback = aiFeedback[translations.length + i];
                  return (
                    <div className="reading-question" key={i}>
                      <label htmlFor={`q-${i}`}>
                        {i + 1}. {question.question}
                      </label>
                      <Input
                        id={`q-${i}`}
                        value={readingAnswers[i] ?? ""}
                        onChange={(e) => setReading(i, e.target.value)}
                        disabled={checked}
                        placeholder="Your answer…"
                      />
                      {checked && feedback && (
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

          {!checked ? (
            <div className="row-actions">
              <Button variant="primary" onClick={check} disabled={busy}>
                <Check size={16} />
                {busy ? "Checking…" : "Check lesson"}
              </Button>
            </div>
          ) : summary ? (
            <Card>
              <div className="block-head">
                <h2>Lesson complete</h2>
              </div>
              <p className="muted">
                You got {summary.correct} of {summary.total} correct.
              </p>
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
            <p className="hint">Saving result…</p>
          )}
        </>
      )}
    </main>
  );
}
