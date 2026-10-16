"use client";

import { useState } from "react";
import Button from "./Button";
import Input from "./Input";

function formsToText(forms) {
  if (Array.isArray(forms)) return forms.filter(Boolean).join(", ");
  if (typeof forms === "string") {
    try {
      const parsed = JSON.parse(forms);
      return Array.isArray(parsed) ? parsed.filter(Boolean).join(", ") : "";
    } catch {
      return "";
    }
  }
  return "";
}

export default function WordEditor({ word, saving, onSave, onClose }) {
  const [value, setValue] = useState({
    word: word.word ?? "",
    translation: word.translation ?? "",
    type: word.type ?? "",
    definition: word.definition ?? "",
    example: word.example ?? "",
    forms: formsToText(word.forms),
  });

  function set(field, next) {
    setValue((prev) => ({ ...prev, [field]: next }));
  }

  function submit(event) {
    event.preventDefault();
    onSave(value);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="block-head">
          <h2>Edit word</h2>
        </div>
        <form onSubmit={submit}>
          <label className="field">
            <span>Word</span>
            <Input value={value.word} onChange={(e) => set("word", e.target.value)} />
          </label>
          <label className="field">
            <span>Translation</span>
            <Input
              value={value.translation}
              onChange={(e) => set("translation", e.target.value)}
              placeholder="Russian translation"
            />
          </label>
          <label className="field">
            <span>Type</span>
            <Input
              value={value.type}
              onChange={(e) => set("type", e.target.value)}
              placeholder="noun / verb / adjective…"
            />
          </label>
          <label className="field">
            <span>Definition</span>
            <textarea
              className="input"
              rows={2}
              value={value.definition}
              onChange={(e) => set("definition", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Example</span>
            <textarea
              className="input"
              rows={2}
              value={value.example}
              onChange={(e) => set("example", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Forms (comma separated)</span>
            <Input
              value={value.forms}
              onChange={(e) => set("forms", e.target.value)}
              placeholder="looked, looking, looks"
            />
          </label>
          <div className="row-actions">
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
