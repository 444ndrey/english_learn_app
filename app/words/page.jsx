"use client";

import { useEffect, useState } from "react";
import AddWordForm from "@/components/AddWordForm";
import WordsTable from "@/components/WordsTable";
import { useToast } from "@/components/ToastProvider";

export default function WordsPage() {
  const { toast } = useToast();
  const [words, setWords] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(true);

  async function loadWords() {
    setLoading(true);
    const res = await fetch("/api/words");
    const data = await res.json();
    setWords(data.words ?? []);
    setTotal(data.total ?? 0);
    setLimit(data.limit ?? 30);
    setLoading(false);
  }

  useEffect(() => {
    loadWords();
  }, []);

  async function addWord({ word }) {
    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast(data.error ?? "Failed to add word", "error");
      return { ok: false };
    }

    setWords((prev) => [data.word, ...prev].slice(0, limit));
    setTotal((prev) => prev + 1);
    toast(`Added "${data.word.word}"`, "success");
    return { ok: true };
  }

  async function remove(id) {
    const word = words.find((w) => w.id === id);
    const res = await fetch(`/api/words/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Failed to delete word", "error");
      return;
    }
    setWords((prev) => prev.filter((w) => w.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    toast(`Removed "${word?.word ?? "word"}"`, "info");
  }

  return (
    <main className="wrap">
      <header className="head">
        <h1>Vocabulary</h1>
        <a href="/" className="link">
          ← Dashboard
        </a>
      </header>

      <AddWordForm onSubmit={addWord} />

      {loading ? (
        <p className="hint">Loading…</p>
      ) : words.length === 0 ? (
        <p className="hint">No words yet. Add your first one above.</p>
      ) : (
        <>
          <p className="hint count-line">
            {total} word{total === 1 ? "" : "s"} total · showing last{" "}
            {words.length}
          </p>
          <WordsTable words={words} onRemove={remove} />
        </>
      )}
    </main>
  );
}
