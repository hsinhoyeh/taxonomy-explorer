import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { Pool } from "pg";

/** Per-user store with two backends:
 *  - Postgres when DATABASE_URL is set (production)
 *  - JSON files under DATA_DIR otherwise (local dev, no DB required)
 * Merge semantics are identical either way: profiles newest-wins
 * (including deletion tombstones), evidence arrays OR together — so
 * syncs are conflict-free and idempotent regardless of order. */

export interface StoredProfile {
  id: string;
  name: string;
  age: number;
  color: string;
  createdAt: number;
  updatedAt?: number;
  deleted?: boolean;
}

export interface UserState {
  profiles: StoredProfile[];
  /** key: `${profileId}:${topicId}` -> checked booleans */
  evidence: Record<string, boolean[]>;
  /** key: `${profileId}:${topicId}` -> first-mastered epoch ms */
  mastered?: Record<string, number>;
}

const EMPTY_STATE: UserState = { profiles: [], evidence: {}, mastered: {} };

export function mergeStates(a: UserState, b: UserState): UserState {
  const profiles = new Map<string, StoredProfile>();
  for (const p of [...a.profiles, ...b.profiles]) {
    const existing = profiles.get(p.id);
    if (!existing || (p.updatedAt ?? p.createdAt) >= (existing.updatedAt ?? existing.createdAt)) {
      profiles.set(p.id, p);
    }
  }
  const evidence: Record<string, boolean[]> = {};
  const keys = new Set([...Object.keys(a.evidence), ...Object.keys(b.evidence)]);
  for (const key of keys) {
    const av = a.evidence[key] ?? [];
    const bv = b.evidence[key] ?? [];
    const len = Math.max(av.length, bv.length);
    evidence[key] = Array.from({ length: len }, (_, i) => Boolean(av[i]) || Boolean(bv[i]));
  }
  // Mastery history: earliest timestamp wins.
  const mastered: Record<string, number> = {};
  for (const [key, ts] of [...Object.entries(a.mastered ?? {}), ...Object.entries(b.mastered ?? {})]) {
    mastered[key] = mastered[key] ? Math.min(mastered[key], ts) : ts;
  }
  return { profiles: [...profiles.values()], evidence, mastered };
}

interface StoreBackend {
  getState(userId: string): Promise<UserState>;
  mergeAndSaveState(userId: string, incoming: UserState): Promise<UserState>;
  /** true = over quota (request not counted); false = counted, proceed */
  consumeSnapQuota(userId: string, limit: number): Promise<boolean>;
}

/* --------------------------- Postgres backend --------------------------- */

function pgBackend(connectionString: string): StoreBackend {
  const pool = new Pool({ connectionString, max: 5 });
  let readyPromise: Promise<void> | null = null;

  function ready(): Promise<void> {
    readyPromise ??= (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_state (
          user_id TEXT PRIMARY KEY,
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS snap_quota (
          user_id TEXT NOT NULL,
          day DATE NOT NULL,
          count INT NOT NULL DEFAULT 0,
          PRIMARY KEY (user_id, day)
        )`);
    })();
    return readyPromise;
  }

  return {
    async getState(userId) {
      await ready();
      const res = await pool.query("SELECT state FROM user_state WHERE user_id = $1", [userId]);
      return (res.rows[0]?.state as UserState) ?? structuredClone(EMPTY_STATE);
    },

    async mergeAndSaveState(userId, incoming) {
      await ready();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const res = await client.query(
          "SELECT state FROM user_state WHERE user_id = $1 FOR UPDATE",
          [userId]
        );
        const current = (res.rows[0]?.state as UserState) ?? EMPTY_STATE;
        const merged = mergeStates(current, incoming);
        await client.query(
          `INSERT INTO user_state (user_id, state, updated_at) VALUES ($1, $2, now())
           ON CONFLICT (user_id) DO UPDATE SET state = $2, updated_at = now()`,
          [userId, JSON.stringify(merged)]
        );
        await client.query("COMMIT");
        return merged;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async consumeSnapQuota(userId, limit) {
      await ready();
      // Atomic upsert-and-increment, capped at the limit.
      const res = await pool.query(
        `INSERT INTO snap_quota (user_id, day, count) VALUES ($1, CURRENT_DATE, 1)
         ON CONFLICT (user_id, day)
         DO UPDATE SET count = snap_quota.count + 1 WHERE snap_quota.count < $2
         RETURNING count`,
        [userId, limit]
      );
      return res.rowCount === 0;
    },
  };
}

/* --------------------------- JSON file backend --------------------------- */

function fileBackend(dataDir: string): StoreBackend {
  interface UserFile {
    state: UserState;
    quota: Record<string, number>;
    updatedAt: number;
  }
  const EMPTY: UserFile = { state: EMPTY_STATE, quota: {}, updatedAt: 0 };
  const locks = new Map<string, Promise<unknown>>();

  function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = locks.get(key) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    locks.set(key, next.catch(() => {}));
    return next;
  }

  function userPath(userId: string): string {
    const safe = crypto.createHash("sha256").update(userId).digest("hex").slice(0, 32);
    return path.join(dataDir, `user-${safe}.json`);
  }

  async function readUser(userId: string): Promise<UserFile> {
    try {
      return JSON.parse(await fs.readFile(userPath(userId), "utf8")) as UserFile;
    } catch {
      return structuredClone(EMPTY);
    }
  }

  async function writeUser(userId: string, file: UserFile): Promise<void> {
    await fs.mkdir(dataDir, { recursive: true });
    const target = userPath(userId);
    const tmp = `${target}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(file));
    await fs.rename(tmp, target);
  }

  return {
    async getState(userId) {
      return (await readUser(userId)).state;
    },
    async mergeAndSaveState(userId, incoming) {
      return withLock(userId, async () => {
        const file = await readUser(userId);
        file.state = mergeStates(file.state, incoming);
        file.updatedAt = Date.now();
        await writeUser(userId, file);
        return file.state;
      });
    },
    async consumeSnapQuota(userId, limit) {
      return withLock(userId, async () => {
        const day = new Date().toISOString().slice(0, 10);
        const file = await readUser(userId);
        const used = file.quota[day] ?? 0;
        if (used >= limit) return true;
        file.quota = { [day]: used + 1 };
        file.updatedAt = Date.now();
        await writeUser(userId, file);
        return false;
      });
    },
  };
}

/* ------------------------------- selection ------------------------------- */

let backend: StoreBackend | null = null;

function getBackend(): StoreBackend {
  backend ??= process.env.DATABASE_URL
    ? pgBackend(process.env.DATABASE_URL)
    : fileBackend(process.env.DATA_DIR || path.join(process.cwd(), "data"));
  return backend;
}

export function getState(userId: string): Promise<UserState> {
  return getBackend().getState(userId);
}

export function mergeAndSaveState(userId: string, incoming: UserState): Promise<UserState> {
  return getBackend().mergeAndSaveState(userId, incoming);
}

export function consumeSnapQuota(userId: string, limit: number): Promise<boolean> {
  return getBackend().consumeSnapQuota(userId, limit);
}
