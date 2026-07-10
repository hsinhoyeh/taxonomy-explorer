"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "zh-tw";

const STORAGE_KEY = "taxonomy-explorer:lang";

const STRINGS = {
  en: {
    appTitle: "Taxonomy Explorer",
    heroTitle: "What are we learning today?",
    heroSubtitle: "Pick a subject to explore what your child can discover next.",
    topicsCount: "topics",
    allSubjects: "All subjects",
    typicalAge: "Typical age",
    years: "years",
    mastered: "mastered",
    needsFirst: "Needs first",
    unlocksNext: "Unlocks next",
    startingPoint: "Nothing — this is a great starting point!",
    noUnlocks: "This doesn't unlock anything else yet.",
    required: "REQUIRED",
    childName: "Child's name",
    childNamePlaceholder: "optional",
    exploreGraph: "Explore graph",
    allDone: "All done! Great job! 🎉",
    tryAsking: "Try asking",
  },
  "zh-tw": {
    appTitle: "學習地圖探索家",
    heroTitle: "今天想學什麼呢？",
    heroSubtitle: "選一個科目，看看孩子接下來可以學什麼。",
    topicsCount: "個主題",
    allSubjects: "所有科目",
    typicalAge: "適合年齡",
    years: "歲",
    mastered: "已完成",
    needsFirst: "要先學會",
    unlocksNext: "接下來可以學",
    startingPoint: "不需要先修 — 這是很棒的起點！",
    noUnlocks: "目前還沒有接下來的主題。",
    required: "必須先會",
    childName: "孩子的名字",
    childNamePlaceholder: "可省略",
    exploreGraph: "探索關聯圖",
    allDone: "全部完成！做得好！🎉",
    tryAsking: "可以這樣問問看",
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === "en" || stored === "zh-tw") {
      setLangState(stored);
    } else if ((navigator.language || "").toLowerCase().startsWith("zh")) {
      setLangState("zh-tw");
    }
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: StringKey) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key,
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}
