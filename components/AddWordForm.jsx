"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import { LEVEL_INTERVAL_DAYS } from "@/lib/vocabulary";

const LEVELS_HINT = Object.entries(LEVEL_INTERVAL_DAYS)
  .map(([level, days]) => `L${level}=${days}d`)
  .join("  ·  ");

export default function AddWordForm({ onSubmit }) {
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    const result = await onSubmit({ word });
    setBusy(false);
    if (result?.ok) {
      setWord("");
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <div className="fields">
          <Input
            placeholder="English word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            autoFocus
          />
          <Button variant="primary" type="submit" disabled={busy}>
            <Plus size={16} />
            Add word
          </Button>
        </div>
        <p className="hint">
          Levels: {LEVELS_HINT}. A mistake drops the word back to level 1.
        </p>
      </form>
    </Card>
  );
}
