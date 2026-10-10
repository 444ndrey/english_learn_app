"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, RefreshCw, Sparkles } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { useToast } from "@/components/ToastProvider";

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dashboard");
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function startLesson() {
    setBusy(true);
    const res = await fetch("/api/lessons", { method: "POST" });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      toast(json.error ?? "Failed to generate lesson", "error");
      return;
    }
    if (json.aiError) {
      toast(`Lesson created, but AI failed: ${json.aiError}`, "error");
    } else {
      toast("Lesson generated", "success");
    }
    router.push(`/lesson/${json.lesson.id}`);
  }

  if (loading || !data) {
    return (
      <main className="wrap">
        <header className="head">
          <h1>English Learning App</h1>
        </header>
        <p className="hint">Loading…</p>
      </main>
    );
  }

  const words = data.wordsToLearn ?? [];
  const todayLesson = data.todayLesson;
  const hasWords = words.length > 0;

  return (
    <main className="wrap">
      <header className="head">
        <h1>English Learning App</h1>
        <Link href="/words" className="link">
          Manage vocabulary
        </Link>
      </header>

      <Card>
        <div className="block-head">
          <h2>Words to learn</h2>
          <span className="badge">{words.length}</span>
        </div>
        {hasWords ? (
          <ul className="word-chips">
            {words.map((word) => (
              <li key={word.id} className="word-chip">
                {word.word}
                <span className="chip-level">L{word.level}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">
            No words are due.{" "}
            <Link href="/words" className="link">
              Add words
            </Link>{" "}
            to start learning.
          </p>
        )}
      </Card>

      <Card>
        <div className="block-head">
          <h2>Today&apos;s lesson</h2>
        </div>

        {todayLesson ? (
          <>
            <p className="muted">
              You already had a lesson today
              {todayLesson.result
                ? ` — score ${todayLesson.result.correct}/${todayLesson.result.total}`
                : ""}
              . Pass it again or generate a new one.
            </p>
            <div className="row-actions">
              <Button
                variant="primary"
                onClick={() => router.push(`/lesson/${todayLesson.id}`)}
              >
                <RefreshCw size={16} />
                Pass last lesson again
              </Button>
              <Button onClick={startLesson} disabled={busy || !hasWords}>
                <Sparkles size={16} />
                Generate new lesson
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              Ready for today&apos;s lesson?
              {hasWords
                ? ` ${words.length} word${words.length === 1 ? "" : "s"} to practice.`
                : " Add words first to generate a lesson."}
            </p>
            <Button variant="primary" onClick={startLesson} disabled={busy || !hasWords}>
              <BookOpen size={16} />
              Start today&apos;s lesson
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
