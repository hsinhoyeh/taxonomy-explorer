"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/** Text-to-speech and speech-to-text via the browser's Web Speech API —
 * no external service. Both components render nothing when the browser
 * lacks the API (e.g. SpeechRecognition on Firefox). */

function speechLang(lang: string): string {
  return lang === "zh-tw" ? "zh-TW" : "en-US";
}

/** Preferred natural voices per language. Names include the localized
 * forms (a Chinese-UI device exposes Apple's "Meijia" as 美佳, Edge's
 * HsiaoChen as 曉臻, etc.) — English-only name matching silently falls
 * through to a zh-CN voice, which is what made zh-TW sound wrong. */
const ZH_TW_NAMES = [
  "Meijia", "美佳", // Apple
  "HsiaoChen", "曉臻", "HsiaoYu", "曉雨", "Yating", "雅婷", "Hanhan", "瀚瀚", // Microsoft
  "Google 國語", // Chrome
];
const EN_NAMES = ["Samantha", "Karen", "Moira", "Daniel", "Google US English"];

function normalizeLang(l: string): string {
  return l.toLowerCase().replace("_", "-");
}

function pickVoice(langTag: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  if (langTag === "zh-TW") {
    for (const name of ZH_TW_NAMES) {
      const v = voices.find((voice) => voice.name.includes(name));
      if (v) return v;
    }
    // Any Taiwan/Traditional voice before ever falling back to zh-CN.
    return (
      voices.find((v) => normalizeLang(v.lang) === "zh-tw") ??
      voices.find((v) => normalizeLang(v.lang).startsWith("zh-hant")) ??
      voices.find((v) => normalizeLang(v.lang).startsWith("zh")) ??
      null
    );
  }

  for (const name of EN_NAMES) {
    const v = voices.find((voice) => voice.name.includes(name));
    if (v) return v;
  }
  return (
    voices.find((v) => normalizeLang(v.lang) === "en-us") ??
    voices.find((v) => normalizeLang(v.lang).startsWith("en")) ??
    null
  );
}

export function SpeakButton({
  text,
  className,
  label,
}: {
  text: string;
  className?: string;
  /** When set, renders as a prominent labeled button instead of a small icon. */
  label?: string;
}) {
  const { lang, t } = useLang();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    // Some browsers populate the voice list asynchronously.
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  if (!supported) return null;

  const speakNow = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    const langTag = speechLang(lang);
    utterance.lang = langTag;
    utterance.rate = 0.9; // slightly slower for kids, per math-adventure tuning
    utterance.pitch = 1.0;
    const voice = pickVoice(langTag);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    setSpeaking(true);
    // Some browsers populate voices asynchronously; speaking before the
    // list arrives falls back to the default voice (often the wrong
    // language entirely). Wait briefly for voiceschanged if needed.
    if (window.speechSynthesis.getVoices().length > 0) {
      speakNow();
      return;
    }
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.speechSynthesis.removeEventListener("voiceschanged", go);
      speakNow();
    };
    window.speechSynthesis.addEventListener("voiceschanged", go);
    setTimeout(go, 400);
  };

  if (label) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition ${
          speaking
            ? "bg-indigo-50 border-indigo-300 text-indigo-700 animate-pulse"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
        } ${className ?? ""}`}
      >
        {speaking ? "🔊" : "🔈"} {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("speakAloud")}
      title={t("speakAloud")}
      className={`inline-flex items-center justify-center rounded-full px-1.5 text-base leading-none align-middle transition ${
        speaking ? "animate-pulse" : "opacity-60 hover:opacity-100"
      } ${className ?? ""}`}
    >
      {speaking ? "🔊" : "🔈"}
    </button>
  );
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

function getRecognition(): RecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Mic button: the child answers aloud, the transcript appears below —
 * a hands-free way for a parent to capture the answer mid-conversation. */
export function AnswerMic() {
  const { lang, t } = useLang();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
    return () => recognitionRef.current?.stop();
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = getRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    recognition.lang = speechLang(lang);
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0]?.transcript ?? "";
      }
      setTranscript(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setTranscript("");
    setListening(true);
    recognition.start();
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition ${
          listening
            ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
        }`}
      >
        {listening ? `⏹ ${t("micListening")}` : `🎤 ${t("micStart")}`}
      </button>
      {transcript && (
        <p className="mt-2 rounded-xl bg-sky-50 border border-sky-200 px-4 py-2 text-sm text-slate-700">
          <span className="font-semibold text-sky-700">{t("sttHeard")}:</span> {transcript}
        </p>
      )}
    </div>
  );
}
