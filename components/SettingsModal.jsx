"use client";

import { useState } from "react";
import Button from "./Button";

export default function SettingsModal({ settings, saving, onSave, onClose }) {
  const [difficulty, setDifficulty] = useState(settings.difficulty.value);
  const [enabled, setEnabled] = useState(
    () => new Set(settings.characters.filter((c) => c.enabled).map((c) => c.id)),
  );

  function toggle(id) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(event) {
    event.preventDefault();
    onSave({ difficulty, characters: [...enabled] });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="block-head">
          <h2>Settings</h2>
        </div>
        <form onSubmit={submit}>
          <div className="setting-group">
            <h3 className="setting-title">Language level</h3>
            <select
              className="input"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {settings.difficulty.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="hint">Suggested: {settings.difficulty.suggested}</p>
          </div>

          <div className="setting-group">
            <h3 className="setting-title">Characters in lessons</h3>
            <ul className="character-list">
              {settings.characters.map((character) => (
                <li className="character-item" key={character.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={enabled.has(character.id)}
                      onChange={() => toggle(character.id)}
                    />
                    <span className="character-info">
                      <span className="strong">{character.name}</span>
                      <span className="muted">{character.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="hint">At least two characters must stay enabled.</p>
          </div>

          <div className="row-actions">
            <Button
              variant="primary"
              type="submit"
              disabled={saving || enabled.size < 2}
            >
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
