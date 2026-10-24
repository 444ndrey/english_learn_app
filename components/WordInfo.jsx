"use client";

import { useCallback, useRef, useState } from "react";

function toForms(forms) {
  if (Array.isArray(forms)) return forms.filter(Boolean);
  if (typeof forms === "string") {
    try {
      const parsed = JSON.parse(forms);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function WordInfo({ word, children, className = "" }) {
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const [placement, setPlacement] = useState("top");
  const [shift, setShift] = useState(0);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;

    const rect = trigger.getBoundingClientRect();
    const popHeight = pop.offsetHeight;
    const popWidth = pop.offsetWidth;
    const gap = 8;
    const margin = 8;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const nextPlacement =
      spaceAbove >= popHeight + gap || spaceAbove >= spaceBelow
        ? "top"
        : "bottom";

    let nextShift = 0;
    if (rect.left + popWidth > window.innerWidth - margin) {
      nextShift = window.innerWidth - margin - (rect.left + popWidth);
    }
    if (rect.left + nextShift < margin) {
      nextShift = margin - rect.left;
    }

    setPlacement(nextPlacement);
    setShift(Math.round(nextShift));
  }, []);

  const type = String(word?.type ?? "").trim();
  const definition = String(word?.definition ?? "").trim();
  const example = String(word?.example ?? "").trim();
  const forms = toForms(word?.forms);

  const label = children ?? word?.word;
  const hasInfo = Boolean(type || definition || example || forms.length);

  if (!hasInfo) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span
      ref={triggerRef}
      className={`word-tip ${className}`.trim()}
      tabIndex={0}
      onMouseEnter={updatePosition}
      onFocus={updatePosition}
    >
      <span className="word-tip-label">{label}</span>
      <span
        ref={popRef}
        className={`word-tip-pop ${placement}`}
        role="tooltip"
        style={{ "--tip-shift": `${shift}px` }}
      >
        {type && <span className="word-tip-type">{type}</span>}
        {definition && <span className="word-tip-def">{definition}</span>}
        {example && <span className="word-tip-ex">&ldquo;{example}&rdquo;</span>}
        {forms.length > 0 && (
          <span className="word-tip-forms">
            {forms.map((form, index) => (
              <span className="word-tip-form" key={index}>
                {form}
              </span>
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
