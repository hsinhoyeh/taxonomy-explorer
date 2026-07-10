"use client";

import { useLang } from "@/lib/i18n";

export default function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-full bg-white/20 p-0.5 text-sm font-semibold">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-3 py-1 rounded-full transition ${
          lang === "en" ? "bg-white text-indigo-600" : "text-white/80"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("zh-tw")}
        className={`px-3 py-1 rounded-full transition ${
          lang === "zh-tw" ? "bg-white text-indigo-600" : "text-white/80"
        }`}
      >
        中文
      </button>
    </div>
  );
}
