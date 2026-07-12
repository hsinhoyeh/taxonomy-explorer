"use client";

import { useLang } from "@/lib/i18n";

export default function LangToggle() {
  const { lang, setLang, zhuyinEnabled, toggleZhuyin } = useLang();
  return (
    <div className="flex items-center gap-2">
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
      {lang === "zh-tw" && (
        <button
          type="button"
          onClick={toggleZhuyin}
          title="注音"
          aria-pressed={zhuyinEnabled}
          className={`rounded-full px-2.5 py-1 text-sm font-semibold transition ${
            zhuyinEnabled ? "bg-white text-indigo-600" : "bg-white/20 text-white/70"
          }`}
        >
          ㄅㄆ
        </button>
      )}
    </div>
  );
}
