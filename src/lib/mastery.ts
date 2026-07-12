"use client";

/** Mastery timestamps: when a topic's evidence list first became fully
 * checked for a profile. Stored per profile as { topicId: epochMs }.
 * Once earned, a mastery record is kept even if items are later unchecked
 * (it is history, not state) — which also makes sync merging trivial:
 * earliest timestamp wins. */

export function masteryStorageKey(profileId: string): string {
  return `taxonomy-explorer:profile:${profileId}:mastered`;
}

export function getMastered(profileId: string): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(masteryStorageKey(profileId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore malformed cache
  }
  return {};
}

export function recordMastery(profileId: string, topicId: string): void {
  const mastered = getMastered(profileId);
  if (mastered[topicId]) return;
  mastered[topicId] = Date.now();
  window.localStorage.setItem(masteryStorageKey(profileId), JSON.stringify(mastered));
}
