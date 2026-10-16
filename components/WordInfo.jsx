"use client";

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
    <span className={`word-tip ${className}`.trim()} tabIndex={0}>
      <span className="word-tip-label">{label}</span>
      <span className="word-tip-pop" role="tooltip">
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
