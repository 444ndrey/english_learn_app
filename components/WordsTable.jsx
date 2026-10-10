"use client";

import { Trash2 } from "lucide-react";
import Button from "./Button";
import { daysUntilNext, nextReviewLabel } from "@/lib/format";

export default function WordsTable({ words, onRemove }) {
  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            <th>Word</th>
            <th>Level</th>
            <th>Last checked</th>
            <th>Next review</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {words.map((word) => {
            const due = daysUntilNext(word) <= 0;
            return (
              <tr key={word.id}>
                <td className="strong">{word.word}</td>
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
