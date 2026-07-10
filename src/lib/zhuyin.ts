import { pinyin } from "pinyin-pro";
import { p2z } from "pinyin-to-zhuyin";

const HAN_RE = /[一-鿿]/;

export interface ZhuyinToken {
  char: string;
  zhuyin?: string;
}

function normalizeTonedPinyin(py: string): string {
  return py.replace(/0$/, "");
}

/** Splits `str` into per-character tokens, each annotated with its Zhuyin
 * reading when the character is Han. Polyphones are resolved using the
 * surrounding sentence via pinyin-pro's dictionary-based segmentation. */
export function toZhuyinTokens(str: string): ZhuyinToken[] {
  const chars = [...str];
  const pinyinSyllables = pinyin(str, { toneType: "num", type: "array" });
  return chars.map((char, i) => {
    if (!HAN_RE.test(char)) return { char };
    const syllable = pinyinSyllables[i];
    if (!syllable) return { char };
    try {
      return { char, zhuyin: p2z(normalizeTonedPinyin(syllable)) };
    } catch {
      return { char };
    }
  });
}
