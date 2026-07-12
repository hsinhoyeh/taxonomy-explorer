"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/** Text-to-speech and speech-to-text via the browser's Web Speech API —
 * no external service. Both components render nothing when the browser
 * lacks the API (e.g. SpeechRecognition on Firefox). */

function speechLang(lang: string): string {
  return lang === "zh-tw" ? "zh-TW" : "en-US";
}

/** Voice preference lists ported from math-adventure (tuned for kids):
 * natural named voices first, then exact/loose language match. Without
 * this, many browsers pick a robotic default for zh-TW. */
const VOICE_PREFS: Record<string, string[]> = {
  "zh-TW": ["Meijia", "Tingting", "zh-TW", "zh_TW", "Chinese (Traditional)"],
  "en-US": ["Samantha", "Karen", "Moira", "Daniel", "en-US", "en_US", "English"],
};

function pickVoice(langTag: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const pref of VOICE_PREFS[langTag] ?? []) {
    const voice = voices.find((v) => v.name.includes(pref) || v.lang === pref);
    if (voice) return voice;
  }
  return voices.find((v) => v.lang.startsWith(langTag.split("-")[0])) ?? null;
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

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langTag = speechLang(lang);
    utterance.lang = langTag;
    utterance.rate = 0.9; // slightly slower for kids, per math-adventure tuning
    utterance.pitch = 1.0;
    const voice = pickVoice(langTag);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
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
