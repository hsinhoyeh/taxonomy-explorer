"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useLang } from "@/lib/i18n";
import { useProfiles } from "@/lib/profiles";
import { Bilingual } from "@/components/Bilingual";
import { getSubjectStyle } from "@/lib/subjectStyle";

interface CandidateView {
  topicId: string;
  confidence: number;
  reason: string;
  name: string;
  nameZh?: string;
  subject: string;
  subjectZh?: string;
  domain: string;
  description: string;
  ageRangeStart: number;
  ageRangeEnd: number;
}

interface SnapResult {
  demo?: boolean;
  conceptSummary: string;
  candidates: CandidateView[];
}

const MAX_EDGE = 1568;

/** Downscale and re-encode through a canvas — bounds upload size and strips
 * EXIF (textbook photos can carry GPS/location metadata). */
async function preprocess(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function SnapContent() {
  const { t } = useLang();
  const { activeProfile } = useProfiles();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SnapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setNeedsLogin(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const image = await preprocess(file);
      setPreview(image);
      const res = await fetch("/api/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, profileAge: activeProfile?.age }),
      });
      if (res.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (res.status === 429) {
        setError(t("snapRateLimited"));
        return;
      }
      if (!res.ok) {
        setError(t("snapError"));
        return;
      }
      setResult(await res.json());
    } catch {
      setError(t("snapError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-2xl mx-auto px-6 py-10 w-full">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">{t("snapTitle")}</h1>
        <p className="text-slate-500 mt-2">{t("snapSubtitle")}</p>
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {!preview && !loading && (
        <div className="text-center">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-8 py-4 text-lg shadow-md"
          >
            {t("snapButton")}
          </motion.button>
        </div>
      )}

      {preview && (
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-64 rounded-xl border border-slate-200 shadow-sm" />
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="inline-block text-3xl"
          >
            🔍
          </motion.div>
          <p className="text-slate-500 mt-2">{t("snapAnalyzing")}</p>
        </div>
      )}

      {needsLogin && (
        <div className="text-center py-4">
          <p className="text-slate-600 mb-3">{t("snapLoginRequired")}</p>
          <button
            type="button"
            onClick={() => signIn("google")}
            className="rounded-xl bg-indigo-500 text-white font-semibold px-5 py-2 hover:bg-indigo-600"
          >
            {t("signIn")}
          </button>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 inline-block">
            {error}
          </p>
          <div className="mt-4">
            <button type="button" onClick={reset} className="text-sm text-slate-500 underline">
              {t("snapTryAgain")}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {result.demo && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 text-center">
                {t("snapDemoNote")}
              </p>
            )}

            {result.candidates.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-500">{t("snapNoMatch")}</p>
                <div className="mt-4 flex justify-center gap-4">
                  <Link href="/" className="text-sm text-indigo-600 underline">
                    {t("allSubjects")}
                  </Link>
                  <button type="button" onClick={reset} className="text-sm text-slate-500 underline">
                    {t("snapTryAgain")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {result.conceptSummary && (
                  <p className="text-sm text-slate-500 mb-3">
                    {t("snapConceptLabel")}: <span className="italic">{result.conceptSummary}</span>
                  </p>
                )}
                <h2 className="text-lg font-bold text-slate-800 mb-3">{t("snapPickTopic")}</h2>
                <ul className="space-y-3">
                  {result.candidates.map((c, i) => {
                    const style = getSubjectStyle(c.subject);
                    return (
                      <motion.li
                        key={c.topicId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <Link
                          href={`/topic/${c.topicId}`}
                          className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold ${style.text}`}>
                              {style.emoji} <Bilingual en={c.subject} zh={c.subjectZh} /> · {c.domain}
                            </span>
                            <span className="text-xs text-slate-400">
                              {t("typicalAge")} {c.ageRangeStart}–{c.ageRangeEnd}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">
                            <Bilingual en={c.name} zh={c.nameZh} />
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">{c.reason}</p>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
                <div className="mt-5 text-center">
                  <button type="button" onClick={reset} className="text-sm text-slate-500 underline">
                    {t("snapTryAgain")}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
