export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

export const LEVEL_INTERVAL_DAYS = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export function intervalDays(level) {
  return LEVEL_INTERVAL_DAYS[level] ?? LEVEL_INTERVAL_DAYS[MIN_LEVEL];
}

// Returns the fields to persist after a practice attempt.
// The review date is only advanced when a correct answer was actually due:
// practicing early must not postpone a word forever, and a word can never
// gain more than one level per day.
export function applyAttempt(word, correct, now = new Date()) {
  const level = Number(word?.level) || MIN_LEVEL;

  if (!correct) {
    return {
      level: Math.max(MIN_LEVEL, level - 1),
      lastCheckedAt: now.toISOString(),
    };
  }

  const dueAt = nextReviewDate(word?.lastCheckedAt, level);
  const wasDue = !dueAt || dueAt <= now;
  if (!wasDue) {
    return { level, lastCheckedAt: word?.lastCheckedAt ?? null };
  }

  return {
    level: Math.min(level + 1, MAX_LEVEL),
    lastCheckedAt: now.toISOString(),
  };
}

export function nextReviewDate(lastCheckedAt, level) {
  if (!lastCheckedAt) return null;
  const next = new Date(lastCheckedAt);
  next.setDate(next.getDate() + intervalDays(level));
  return next;
}

export function isDue(lastCheckedAt, level, now = new Date()) {
  const next = nextReviewDate(lastCheckedAt, level);
  if (!next) return true;
  return next <= now;
}
