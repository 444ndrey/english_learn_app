// Local mascot reactions keyed by score, so feedback feels alive without
// spending an AI call. Personality comes from data/characters.json.
const LINES = {
  aiko: {
    perfect: [
      "Flawless. I'm almost impressed.",
      "Perfect. Don't let it go to your head.",
    ],
    good: [
      "Not bad. A few cracks, but you're getting there.",
      "Decent. Tidy up the misses and we'll talk.",
    ],
    bad: [
      "Ouch. We have work to do.",
      "That was rough. Try again — I'll wait.",
    ],
  },
  ren: {
    perfect: [
      "Huh. You actually nailed it.",
      "Perfect. Rare, but it happens.",
    ],
    good: [
      "Good enough. Barely.",
      "Not terrible. Keep going.",
    ],
    bad: [
      "Well. That was a disaster.",
      "We should probably review that. Again.",
    ],
  },
};

function bucket(ratio) {
  if (ratio >= 1) return "perfect";
  if (ratio >= 0.6) return "good";
  return "bad";
}

export function reactionLine(characterId, correct, total, seed = 0) {
  const ratio = total > 0 ? correct / total : 0;
  const key = bucket(ratio);
  const lines = LINES[characterId]?.[key] ?? LINES.ren[key];
  return lines[Math.abs(seed) % lines.length];
}

export function stageCharacter(stageIndex) {
  return stageIndex % 2 === 0 ? "aiko" : "ren";
}
