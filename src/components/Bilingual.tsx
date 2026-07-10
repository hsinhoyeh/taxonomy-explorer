"use client";

import { Fragment, useMemo } from "react";
import { useLang } from "@/lib/i18n";
import { toZhuyinTokens } from "@/lib/zhuyin";

/** Renders zh-TW text with per-character Zhuyin (注音) ruby annotations. */
export function ZhuyinText({ text }: { text: string }) {
  const tokens = useMemo(() => toZhuyinTokens(text), [text]);
  return (
    <>
      {tokens.map((tok, i) =>
        tok.zhuyin ? (
          <ruby key={i} className="zy-ruby">
            {tok.char}
            <rt className="zy-rt">{tok.zhuyin}</rt>
          </ruby>
        ) : (
          <Fragment key={i}>{tok.char}</Fragment>
        )
      )}
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
