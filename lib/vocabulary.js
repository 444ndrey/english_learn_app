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

export function applyResult(level, correct) {
  if (!correct) return MIN_LEVEL;
  return Math.min(level + 1, MAX_LEVEL);
}

export function applyAttemptLevel(level, lastCheckedAt, correct, now = new Date()) {
  if (!correct) return MIN_LEVEL;
  const dueAt = nextReviewDate(lastCheckedAt, level);
  const wasDue = !dueAt || dueAt <= now;
  return wasDue ? Math.min(level + 1, MAX_LEVEL) : level;
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
