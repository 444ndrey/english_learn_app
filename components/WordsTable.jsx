"use client";

import { Pencil, Trash2 } from "lucide-react";
import Button from "./Button";
import WordInfo from "./WordInfo";
import { daysUntilNext, nextReviewLabel } from "@/lib/format";

function SortHeader({ label, column, sort, dir, onSort }) {
  const active = sort === column;
  return (
    <th>
      <button
        type="button"
        className={`sort-btn ${active ? "active" : ""}`}
        onClick={() => onSort(column)}
      >
        {label}
        {active ? (dir === "asc" ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
}

export default function WordsTable({ words, sort, dir, onSort, onEdit, onRemove }) {
  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            <SortHeader
              label="Word"
              column="word"
              sort={sort}
              dir={dir}
              onSort={onSort}
            />
            <th>Translation</th>
            <SortHeader
              label="Level"
              column="level"
              sort={sort}
              dir={dir}
              onSort={onSort}
            />
            <SortHeader
              label="Last checked"
              column="lastCheckedAt"
              sort={sort}
              dir={dir}
              onSort={onSort}
            />
            <th>Next review</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {words.map((word) => {
            const due = daysUntilNext(word) <= 0;
            return (
              <tr key={word.id}>
                <td>
                  <WordInfo word={word} className="strong" />
                </td>
                <td className="muted">{word.translation || "—"}</td>
                <td>
                  <span className="badge">L{word.level}</span>
                </td>
                <td className="muted">
                  {word.lastCheckedAt
                    ? new Date(word.lastCheckedAt).toLocaleString()
                    : "—"}
                </td>
                <td className={due ? "due" : "muted"}>
                  {nextReviewLabel(word)}
                </td>
                <td className="actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Edit"
                    onClick={() => onEdit(word)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Delete"
                    onClick={() => onRemove(word.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
