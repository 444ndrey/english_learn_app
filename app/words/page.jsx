"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import AddWordForm from "@/components/AddWordForm";
import Button from "@/components/Button";
import Input from "@/components/Input";
import WordEditor from "@/components/WordEditor";
import WordsTable from "@/components/WordsTable";
import { useToast } from "@/components/ToastProvider";

const PAGE_SIZE = 30;

export default function WordsPage() {
  const { toast } = useToast();
  const [words, setWords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState("desc");
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadWords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      q,
      sort,
      dir,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    const res = await fetch(`/api/words?${params.toString()}`);
    const data = await res.json();
    setWords(data.words ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [q, sort, dir, page, reloadToken]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function reload() {
    setPage(1);
    setReloadToken((token) => token + 1);
  }

  function toggleSort(column) {
    if (sort === column) {
      setDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(column);
      setDir(column === "word" ? "asc" : "desc");
    }
    setPage(1);
  }

  async function addWord({ word, translation }) {
    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, translation }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast(data.error ?? "Failed to add word", "error");
      return { ok: false };
    }

    if (data.aiError) {
      toast(
        `Added "${data.word.word}", but AI details failed: ${data.aiError}`,
        "error",
      );
    } else {
      toast(`Added "${data.word.word}"`, "success");
    }
    reload();
    return { ok: true };
  }

  async function saveEdit(value) {
    if (!editing) return;
    setSavingEdit(true);
    const res = await fetch(`/api/words/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const data = await res.json();
    setSavingEdit(false);

    if (!res.ok) {
      toast(data.error ?? "Failed to save word", "error");
      return;
    }
    toast("Word updated", "success");
    setEditing(null);
    loadWords();
  }

  async function enrichMissing() {
    setEnriching(true);
    const res = await fetch("/api/words/enrich", { method: "POST" });
    const data = await res.json();
    setEnriching(false);

    if (!res.ok) {
      toast("Failed to generate word details", "error");
      return;
    }
    if (data.aiError) {
      toast(`AI failed: ${data.aiError}`, "error");
      return;
    }
    if (data.updated > 0) {
      toast(
        `Generated details for ${data.updated} word${data.updated === 1 ? "" : "s"}`,
        "success",
      );
    } else {
      toast("All words already have details", "info");
    }
    loadWords();
  }

  async function remove(id) {
    const word = words.find((w) => w.id === id);
    const res = await fetch(`/api/words/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Failed to delete word", "error");
      return;
    }
    toast(`Removed "${word?.word ?? "word"}"`, "info");
    reload();
  }

  const missingDetails = words.some((word) => !word.definition);

  return (
    <main className="wrap">
      <header className="head">
        <h1>Vocabulary</h1>
        <a href="/" className="link">
          ← Dashboard
        </a>
      </header>

      <AddWordForm onSubmit={addWord} />

      <div className="search-row">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <Input
            className="search-input"
            placeholder="Search words, translations, definitions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              title="Clear"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {!loading && missingDetails && (
          <Button onClick={enrichMissing} disabled={enriching}>
            <Sparkles size={16} />
            {enriching ? "Generating details…" : "Generate missing details with AI"}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="hint">Loading…</p>
      ) : words.length === 0 ? (
        <p className="hint">
          {q
            ? `Nothing matches “${q}”.`
            : "No words yet. Add your first one above."}
        </p>
      ) : (
        <>
          <p className="hint count-line">
            {total} word{total === 1 ? "" : "s"} total
            {q ? ` matching “${q}”` : ""}
          </p>
          <WordsTable
            words={words}
            sort={sort}
            dir={dir}
            onSort={toggleSort}
            onEdit={setEditing}
            onRemove={remove}
          />
          {totalPages > 1 && (
            <div className="pagination">
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Prev
              </Button>
              <span className="muted">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next →
              </Button>
            </div>
          )}
        </>
      )}

      {editing && (
        <WordEditor
          word={editing}
          saving={savingEdit}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
