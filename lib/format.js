import { intervalDays } from "./vocabulary";

const DAY_MS = 86400000;

export function daysUntilNext(word) {
  if (!word.lastCheckedAt) return 0;
  const next = new Date(word.lastCheckedAt);
  next.setDate(next.getDate() + intervalDays(word.level));
  return Math.ceil((next.getTime() - Date.now()) / DAY_MS);
}

export function nextReviewLabel(word) {
  const days = daysUntilNext(word);
  if (days <= 0) return "due now";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}
