"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/** Text-to-speech and speech-to-text via the browser's Web Speech API —
 * no external service. Both components render nothing when the browser
 * lacks the API (e.g. SpeechRecognition on Firefox). */

function speechLang(lang: string): string {
  return lang === "zh-tw" ? "zh-TW" : "en-US";
}

export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const { lang, t } = useLang();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
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
    utterance.lang = speechLang(lang);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

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
    <div className="mt-3">
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
