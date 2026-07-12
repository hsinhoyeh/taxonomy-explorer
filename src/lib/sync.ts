"use client";

/** Client half of cross-device sync. localStorage stays the source of truth
 * for rendering (works offline/anonymous); when signed in, the full local
 * state is pushed and the server's merged result adopted. Merge semantics
 * are monotone (profiles newest-wins incl. tombstones; evidence ORs), so
 * pushes are safe to fire-and-forget in any order. */

const PROFILES_KEY = "taxonomy-explorer:profiles";
const EVIDENCE_PREFIX = "taxonomy-explorer:profile:";

export const SYNC_APPLIED_EVENT = "taxonomy-sync-applied";

interface LocalProfile {
  id: string;
  name: string;
  age: number;
  color: string;
  createdAt: number;
  updatedAt?: number;
  deleted?: boolean;
}

interface LocalState {
  profiles: LocalProfile[];
  evidence: Record<string, boolean[]>;
  mastered: Record<string, number>;
}

let syncEnabled = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function setSyncEnabled(enabled: boolean) {
  syncEnabled = enabled;
}

export function collectLocalState(): LocalState {
  let profiles: LocalProfile[] = [];
  try {
    profiles = JSON.parse(window.localStorage.getItem(PROFILES_KEY) ?? "[]");
  } catch {
    // ignore malformed cache
  }
  const evidence: Record<string, boolean[]> = {};
  const mastered: Record<string, number> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(EVIDENCE_PREFIX)) continue;
    const rest = key.slice(EVIDENCE_PREFIX.length);
    const evParts = rest.split(":evidence:"); // `${profileId}:evidence:${topicId}`
    if (evParts.length === 2) {
      try {
        const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
        if (Array.isArray(value)) evidence[`${evParts[0]}:${evParts[1]}`] = value;
      } catch {
        // ignore malformed entry
      }
      continue;
    }
    if (rest.endsWith(":mastered")) {
      const profileId = rest.slice(0, -":mastered".length);
      try {
        const map = JSON.parse(window.localStorage.getItem(key) ?? "{}");
        for (const [topicId, ts] of Object.entries(map)) {
          if (typeof ts === "number") mastered[`${profileId}:${topicId}`] = ts;
        }
      } catch {
        // ignore malformed entry
      }
    }
  }
  return { profiles, evidence, mastered };
}

function applyState(state: LocalState) {
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(state.profiles));
  for (const [key, value] of Object.entries(state.evidence)) {
    const sep = key.indexOf(":");
    const profileId = key.slice(0, sep);
    const topicId = key.slice(sep + 1);
    window.localStorage.setItem(
      `${EVIDENCE_PREFIX}${profileId}:evidence:${topicId}`,
      JSON.stringify(value)
    );
  }
  const masteredByProfile: Record<string, Record<string, number>> = {};
  for (const [key, ts] of Object.entries(state.mastered ?? {})) {
    const sep = key.indexOf(":");
    const profileId = key.slice(0, sep);
    const topicId = key.slice(sep + 1);
    (masteredByProfile[profileId] ??= {})[topicId] = ts;
  }
  for (const [profileId, map] of Object.entries(masteredByProfile)) {
    window.localStorage.setItem(`${EVIDENCE_PREFIX}${profileId}:mastered`, JSON.stringify(map));
  }
  window.dispatchEvent(new Event(SYNC_APPLIED_EVENT));
}

async function push(): Promise<void> {
  if (!syncEnabled) return;
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectLocalState()),
    });
    if (res.ok) applyState(await res.json());
  } catch {
    // offline or transient failure — the next push carries the same state
  }
}

/** Debounced push; call after any local profile/evidence mutation. */
export function schedulePush() {
  if (!syncEnabled) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, 2000);
}

/** Initial sync on sign-in: push local state, adopt the merged result. */
export async function initialSync(): Promise<void> {
  await push();
}
