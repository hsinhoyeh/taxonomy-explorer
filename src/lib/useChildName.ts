"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "taxonomy-explorer:child-name";

export function useChildName(): [string, (name: string) => void] {
  const [name, setName] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setName(stored);
  }, []);

  const update = (next: string) => {
    setName(next);
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, next);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return [name, update];
}

export function fillPrompt(prompt: string, name: string): string {
  const who = name.trim() || "your child";
  return prompt.replaceAll("{{name}}", who);
}
