import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, Type } from "@google/genai";

/** Vision-LLM provider layer for Snap-to-Ask. Preference order:
 * GEMINI_API_KEY (free tier) → ANTHROPIC_API_KEY → none (demo mode). */

export interface Extraction {
  subject: string;
  concepts: string[];
  gradeHint: { minAge: number; maxAge: number };
  readable: boolean;
}

export interface RankedCandidate {
  topicId: string;
  confidence: number;
  reason: string;
}

export interface VisionProvider {
  name: string;
  extract(mediaType: string, base64Data: string, subjects: string[]): Promise<Extraction>;
  rank(concepts: string[], poolLines: string): Promise<RankedCandidate[]>;
}

function extractPrompt(subjects: string[]): string {
  return `This is a photo of a school textbook or workbook page (likely Traditional Chinese, possibly with Zhuyin annotations — Zhuyin means early elementary). Identify what it teaches.

Pick the subject from exactly this list (or "Other" if none fit): ${subjects.join(", ")}.
Note there is no "Social Studies" subject — for pages about society, civics, money, economics, or daily life (社會/生活), pick the closest of Life Skills, History, or Personal & Social Development.

Describe the specific concept(s) being taught, not the page layout. Estimate the age range of the target student. Set readable=false if the image is not a readable learning page.`;
}

function rankPrompt(concepts: string[], poolLines: string): string {
  return `A textbook page teaches these concepts: ${concepts.join("; ")}.

From the topic list below, choose up to 3 topics that best match what the page teaches, with a confidence from 0 to 1. Only include genuinely relevant topics — return an empty list rather than weak matches.

${poolLines}`;
}

/* ---------------------------- Gemini ---------------------------- */

const GEMINI_MODEL = process.env.SNAP_GEMINI_MODEL || "gemini-2.5-flash";

const GEMINI_EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    concepts: { type: Type.ARRAY, items: { type: Type.STRING } },
    gradeHint: {
      type: Type.OBJECT,
      properties: {
        minAge: { type: Type.INTEGER },
        maxAge: { type: Type.INTEGER },
      },
      required: ["minAge", "maxAge"],
    },
    readable: { type: Type.BOOLEAN },
  },
  required: ["subject", "concepts", "gradeHint", "readable"],
};

const GEMINI_RANK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topicId: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reason: { type: Type.STRING },
        },
        required: ["topicId", "confidence", "reason"],
      },
    },
  },
  required: ["candidates"],
};

function geminiProvider(apiKey: string): VisionProvider {
  const ai = new GoogleGenAI({ apiKey });
  return {
    name: "gemini",
    async extract(mediaType, base64Data, subjects) {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: mediaType, data: base64Data } },
              { text: extractPrompt(subjects) },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_EXTRACT_SCHEMA,
        },
      });
      return JSON.parse(response.text ?? "{}") as Extraction;
    },
    async rank(concepts, poolLines) {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: rankPrompt(concepts, poolLines) }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RANK_SCHEMA,
        },
      });
      const parsed = JSON.parse(response.text ?? "{}") as { candidates?: RankedCandidate[] };
      return parsed.candidates ?? [];
    },
  };
}

/* --------------------------- Anthropic --------------------------- */

const CLAUDE_MODEL = process.env.SNAP_MODEL || "claude-haiku-4-5";

const CLAUDE_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    concepts: { type: "array", items: { type: "string" } },
    gradeHint: {
      type: "object",
      properties: { minAge: { type: "integer" }, maxAge: { type: "integer" } },
      required: ["minAge", "maxAge"],
      additionalProperties: false,
    },
    readable: { type: "boolean" },
  },
  required: ["subject", "concepts", "gradeHint", "readable"],
  additionalProperties: false,
} as const;

const CLAUDE_RANK_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topicId: { type: "string" },
          confidence: { type: "number" },
          reason: { type: "string" },
        },
        required: ["topicId", "confidence", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["candidates"],
  additionalProperties: false,
} as const;

function firstText(response: Anthropic.Message): string {
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no text block in response");
  return block.text;
}

function anthropicProvider(): VisionProvider {
  const client = new Anthropic();
  return {
    name: "anthropic",
    async extract(mediaType, base64Data, subjects) {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        output_config: { format: { type: "json_schema", schema: CLAUDE_EXTRACT_SCHEMA } },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                  data: base64Data,
                },
              },
              { type: "text", text: extractPrompt(subjects) },
            ],
          },
        ],
      });
      return JSON.parse(firstText(response)) as Extraction;
    },
    async rank(concepts, poolLines) {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        output_config: { format: { type: "json_schema", schema: CLAUDE_RANK_SCHEMA } },
        messages: [{ role: "user", content: rankPrompt(concepts, poolLines) }],
      });
      const parsed = JSON.parse(firstText(response)) as { candidates?: RankedCandidate[] };
      return parsed.candidates ?? [];
    },
  };
}

export function getVisionProvider(): VisionProvider | null {
  if (process.env.GEMINI_API_KEY) return geminiProvider(process.env.GEMINI_API_KEY);
  if (process.env.ANTHROPIC_API_KEY) return anthropicProvider();
  return null;
}
