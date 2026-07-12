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
    addChild: "Add child",
    progressMap: "Progress",
    progressMapTitle: "Learning progress",
    progressMapSubtitle: "How far along each subject, based on age-appropriate topics.",
    noProfileYet: "Add a child above to start tracking progress.",
    topicsOf: "of",
    topicsMastered: "topics mastered",
    noProfiles: "No children added yet.",
    snapNav: "Snap",
    snapTitle: "Snap today's textbook page 📸",
    snapSubtitle:
      "Take a photo of what your child learned at school today, and get tonight's conversation question.",
    snapButton: "Take or choose a photo",
    snapAnalyzing: "Reading the page…",
    snapPickTopic: "Which of these matches the page?",
    snapNoMatch: "Couldn't match this page to a topic — try browsing by subject instead.",
    snapTryAgain: "Try another photo",
    snapDemoNote: "Demo result — the AI reader isn't connected yet, so this shows a sample match.",
    snapError: "Something went wrong reading the photo. Please try again.",
    snapRateLimited: "You've reached today's photo limit. Try again tomorrow.",
    snapConceptLabel: "This page seems to teach",
    snapHomeCta: "📸 Snap a textbook page",
    signIn: "Sign in",
    signOut: "Sign out",
    snapLoginRequired: "Please sign in to use the photo feature.",
    speakAloud: "Read aloud",
    speakQuestion: "Read the question",
    micStart: "Let your child answer",
    micListening: "Listening… tap to stop",
    sttHeard: "Heard",
    trajectoryTitle: "Learning journey",
    trajectoryEmpty: "Complete a topic's checklist to start the journey!",
    trajectoryBaseline: "Includes {n} topics mastered before tracking began.",
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
    addChild: "新增孩子",
    progressMap: "學習進度",
    progressMapTitle: "學習進度地圖",
    progressMapSubtitle: "根據適合年齡的主題，看看每個科目學到哪裡了。",
    noProfileYet: "先在上方新增孩子，才能開始追蹤進度。",
    topicsOf: "／",
    topicsMastered: "個主題已完成",
    noProfiles: "還沒有新增任何孩子。",
    snapNav: "拍課本",
    snapTitle: "拍下今天的課本 📸",
    snapSubtitle: "拍一張孩子今天在學校學的課本頁面，馬上得到今晚的聊天問題。",
    snapButton: "拍照或選擇照片",
    snapAnalyzing: "正在閱讀這一頁…",
    snapPickTopic: "哪一個和這頁的內容最符合？",
    snapNoMatch: "找不到符合這一頁的主題 — 試試直接瀏覽科目吧。",
    snapTryAgain: "再拍一張",
    snapDemoNote: "示範結果 — AI 閱讀功能尚未連接，這是範例配對。",
    snapError: "讀取照片時發生錯誤，請再試一次。",
    snapRateLimited: "今天的照片次數已用完，明天再試試吧。",
    snapConceptLabel: "這一頁似乎在教",
    snapHomeCta: "📸 拍一頁課本",
    signIn: "登入",
    signOut: "登出",
    snapLoginRequired: "請先登入才能使用拍照功能。",
    speakAloud: "朗讀",
    speakQuestion: "唸出問題",
    micStart: "讓孩子說說看",
    micListening: "聆聽中… 點一下停止",
    sttHeard: "聽到",
    trajectoryTitle: "學習軌跡",
    trajectoryEmpty: "完成一個主題的檢核清單，就會開始記錄學習軌跡！",
    trajectoryBaseline: "包含開始記錄之前已完成的 {n} 個主題。",
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

const ZHUYIN_KEY = "taxonomy-explorer:zhuyin";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
  zhuyinEnabled: boolean;
  toggleZhuyin: () => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [zhuyinEnabled, setZhuyinEnabled] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === "en" || stored === "zh-tw") {
      setLangState(stored);
    } else if ((navigator.language || "").toLowerCase().startsWith("zh")) {
      setLangState("zh-tw");
    }
    setZhuyinEnabled(window.localStorage.getItem(ZHUYIN_KEY) !== "off");
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const toggleZhuyin = () => {
    setZhuyinEnabled((prev) => {
      window.localStorage.setItem(ZHUYIN_KEY, prev ? "off" : "on");
      return !prev;
    });
  };

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: StringKey) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key,
      zhuyinEnabled,
      toggleZhuyin,
    }),
    [lang, zhuyinEnabled]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}
