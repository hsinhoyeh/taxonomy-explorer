"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface Profile {
  id: string;
  name: string;
  age: number;
  color: string;
  createdAt: number;
}

const PROFILES_KEY = "taxonomy-explorer:profiles";
const ACTIVE_KEY = "taxonomy-explorer:active-profile";
const LEGACY_NAME_KEY = "taxonomy-explorer:child-name";

export const PROFILE_COLORS = [
  "#f43f5e",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#d946ef",
  "#84cc16",
];

function nextColor(existing: Profile[]): string {
  return PROFILE_COLORS[existing.length % PROFILE_COLORS.length];
}

export function evidenceStorageKey(profileId: string, topicId: string): string {
  return `taxonomy-explorer:profile:${profileId}:evidence:${topicId}`;
}

export function fillPrompt(prompt: string, name: string): string {
  const who = name.trim() || "your child";
  return prompt.replaceAll("{{name}}", who);
}

interface ProfilesContextValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  addProfile: (name: string, age: number) => Profile;
  switchProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  ready: boolean;
}

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let loaded: Profile[] = [];
    try {
      const raw = window.localStorage.getItem(PROFILES_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch {
      // ignore malformed cache
    }

    // Migrate the old single free-text child name into a first profile.
    if (loaded.length === 0) {
      const legacyName = window.localStorage.getItem(LEGACY_NAME_KEY);
      if (legacyName) {
        loaded = [
          {
            id: crypto.randomUUID(),
            name: legacyName,
            age: 7,
            color: PROFILE_COLORS[0],
            createdAt: Date.now(),
          },
        ];
        window.localStorage.setItem(PROFILES_KEY, JSON.stringify(loaded));
        window.localStorage.removeItem(LEGACY_NAME_KEY);
      }
    }

    setProfiles(loaded);
    const storedActive = window.localStorage.getItem(ACTIVE_KEY);
    setActiveId(storedActive && loaded.some((p) => p.id === storedActive) ? storedActive : loaded[0]?.id ?? null);
    setReady(true);
  }, []);

  const persist = (next: Profile[]) => {
    setProfiles(next);
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify(next));
  };

  const addProfile = (name: string, age: number): Profile => {
    const profile: Profile = {
      id: crypto.randomUUID(),
      name: name.trim() || "Kid",
      age,
      color: nextColor(profiles),
      createdAt: Date.now(),
    };
    const next = [...profiles, profile];
    persist(next);
    setActiveId(profile.id);
    window.localStorage.setItem(ACTIVE_KEY, profile.id);
    return profile;
  };

  const switchProfile = (id: string) => {
    setActiveId(id);
    window.localStorage.setItem(ACTIVE_KEY, id);
  };

  const deleteProfile = (id: string) => {
    const next = profiles.filter((p) => p.id !== id);
    persist(next);
    if (activeId === id) {
      const fallback = next[0]?.id ?? null;
      setActiveId(fallback);
      if (fallback) window.localStorage.setItem(ACTIVE_KEY, fallback);
      else window.localStorage.removeItem(ACTIVE_KEY);
    }
  };

  const value = useMemo<ProfilesContextValue>(
    () => ({
      profiles,
      activeProfile: profiles.find((p) => p.id === activeId) ?? null,
      addProfile,
      switchProfile,
      deleteProfile,
      ready,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profiles, activeId, ready]
  );

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}

export function useProfiles(): ProfilesContextValue {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error("useProfiles must be used within a ProfilesProvider");
  return ctx;
}
