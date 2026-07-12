"use client";

import { Fragment, useMemo } from "react";
import { useLang } from "@/lib/i18n";
import { toZhuyinTokens } from "@/lib/zhuyin";

const TONE_MARKS = "ˊˇˋ";

/** Renders zh-TW text with Zhuyin (注音) beside each character — a vertical
 * symbol column to the right with the tone mark alongside, matching how
 * Taiwanese textbooks print it (layout ported from code-quest-kids).
 * Respects the global zhuyin show/hide toggle. */
export function ZhuyinText({ text }: { text: string }) {
  const { zhuyinEnabled } = useLang();
  const tokens = useMemo(() => toZhuyinTokens(text), [text]);

  if (!zhuyinEnabled) return <>{text}</>;

  return (
    <>
      {tokens.map((tok, i) => {
        if (!tok.zhuyin) return <Fragment key={i}>{tok.char}</Fragment>;
        let base = tok.zhuyin;
        let tone = "";
        let neutral = false;
        if (base.startsWith("˙")) {
          neutral = true;
          tone = "˙";
          base = base.slice(1);
        } else if (TONE_MARKS.includes(base[base.length - 1])) {
          tone = base[base.length - 1];
          base = base.slice(0, -1);
        }
        return (
          <span key={i} className="zy">
            <span className="zy-c">{tok.char}</span>
            <span className={`zy-z${neutral ? " zy-neu" : ""}`}>
              {neutral && <span className="zy-t">{tone}</span>}
              <span className="zy-b">{base}</span>
              {!neutral && tone && <span className="zy-t">{tone}</span>}
            </span>
          </span>
        );
      })}
    </>
  );
}

/** Picks English or zh-TW (with Zhuyin) text based on the active language.
 * Falls back to English when no translation is available for this string. */
export function Bilingual({ en, zh }: { en: string; zh?: string }) {
  const { lang } = useLang();
  if (lang === "zh-tw" && zh) return <ZhuyinText text={zh} />;
  return <>{en}</>;
}
