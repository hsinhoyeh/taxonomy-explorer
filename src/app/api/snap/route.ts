import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAllTopics, getTopicTranslation, getSubjects, getSubjectZh } from "@/lib/taxonomy";
import type { Topic } from "@/lib/types";

export const runtime = "nodejs";

// PRD chose a Haiku-class vision model for cost (<US$0.01/snap);
// override with SNAP_MODEL after the M0 benchmark if quality demands it.
const MODEL = process.env.SNAP_MODEL || "claude-haiku-4-5";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DAILY_LIMIT = 20;
const CONFIDENCE_FLOOR = 0.3;

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface Candidate {
  topicId: string;
  confidence: number;
  reason: string;
}

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

// Single-container deployment, so in-memory per-IP counters are sufficient (FR-7).
const usage = new Map<string, { day: string; count: number }>();

function rateLimited(ip: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = usage.get(ip);
  if (!entry || entry.day !== day) {
    usage.set(ip, { day, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > DAILY_LIMIT;
}

function toView(c: Candidate, topic: Topic): CandidateView {
  return {
    topicId: topic.id,
    confidence: c.confidence,
    reason: c.reason,
    name: topic.name,
    nameZh: getTopicTranslation(topic.id)?.name,
    subject: topic.subject,
    subjectZh: getSubjectZh(topic.subject),
    domain: topic.domain,
    description: topic.description,
    ageRangeStart: topic.ageRangeStart,
    ageRangeEnd: topic.ageRangeEnd,
  };
}

/** Demo mode — no API key configured. Returns the PRD's validated example
 * (the 貨幣的演進 textbook page → "What Money Is") so the full UI flow is
 * testable end-to-end before an LLM key is connected. */
function demoResponse(): NextResponse {
  const byId = new Map(getAllTopics().map((t) => [t.id, t]));
  const demo: Candidate[] = [
    { topicId: "mt_SsS7GptD_o", confidence: 0.92, reason: "Covers the history of money from barter to coins — the page's core concept" },
    { topicId: "mt_SbEaQnMQoD", confidence: 0.55, reason: "Introduces buyers, sellers, and exchange" },
    { topicId: "mt_RNRymbz5SO", confidence: 0.4, reason: "Basic transactions: paying and receiving change" },
  ];
  return NextResponse.json({
    demo: true,
    conceptSummary: "Demo result: the evolution of money — barter, its problems, and commodity money like shells.",
    candidates: demo
      .map((c) => {
        const topic = byId.get(c.topicId);
        return topic ? toView(c, topic) : null;
      })
      .filter(Boolean),
  });
}

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    subject: {
      type: "string",
      description: "The school subject this page belongs to, chosen from the provided list, or Other",
    },
    concepts: {
      type: "array",
      items: { type: "string" },
      description: "1-3 specific concepts this page teaches, each as a short English phrase",
    },
    gradeHint: {
      type: "object",
      properties: {
        minAge: { type: "integer" },
        maxAge: { type: "integer" },
      },
      required: ["minAge", "maxAge"],
      additionalProperties: false,
    },
    readable: {
      type: "boolean",
      description: "false if the image is not a readable textbook/learning page",
    },
  },
  required: ["subject", "concepts", "gradeHint", "readable"],
  additionalProperties: false,
} as const;

const RANK_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topicId: { type: "string" },
          confidence: { type: "number", description: "0 to 1" },
          reason: { type: "string", description: "One short sentence, in English" },
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

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { image?: string; profileAge?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const dataUrl = body.image ?? "";
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }
  const [, mediaType, base64Data] = match;
  if (!ALLOWED_MEDIA.has(mediaType)) {
    return NextResponse.json({ error: "unsupported_media" }, { status: 400 });
  }
  if (base64Data.length * 0.75 > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return demoResponse();
  }

  const client = new Anthropic();
  const subjects = getSubjects();

  try {
    // Stage 1: what does this page teach?
    const extractResponse = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: {
        format: { type: "json_schema", schema: EXTRACT_SCHEMA },
      },
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
            {
              type: "text",
              text: `This is a photo of a school textbook or workbook page (likely Traditional Chinese, possibly with Zhuyin annotations — Zhuyin means early elementary). Identify what it teaches.\n\nPick the subject from exactly this list (or "Other" if none fit): ${subjects.join(", ")}.\n\nDescribe the specific concept(s) being taught, not the page layout. Estimate the age range of the target student.`,
            },
          ],
        },
      ],
    });

    const extracted = JSON.parse(firstText(extractResponse)) as {
      subject: string;
      concepts: string[];
      gradeHint: { minAge: number; maxAge: number };
      readable: boolean;
    };

    if (!extracted.readable || extracted.concepts.length === 0) {
      return NextResponse.json({ candidates: [], conceptSummary: "" });
    }

    // Filter candidates by subject and age band before the re-rank.
    const allTopics = getAllTopics();
    const age = body.profileAge;
    const minAge = Math.min(extracted.gradeHint.minAge, age ?? Infinity) - 1;
    const maxAge = Math.max(extracted.gradeHint.maxAge, age ?? -Infinity) + 1;
    let pool = allTopics.filter(
      (t) =>
        (extracted.subject === "Other" || t.subject === extracted.subject) &&
        t.ageRangeStart <= maxAge &&
        t.ageRangeEnd >= minAge
    );
    if (pool.length === 0) pool = allTopics.filter((t) => t.subject === extracted.subject);
    if (pool.length === 0) pool = allTopics;
    pool = pool.slice(0, 120);

    // Stage 2: re-rank the pool against the extracted concepts.
    const poolLines = pool
      .map((t) => `${t.id} | ${t.name} | ages ${t.ageRangeStart}-${t.ageRangeEnd} | ${t.description.slice(0, 160)}`)
      .join("\n");

    const rankResponse = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: {
        format: { type: "json_schema", schema: RANK_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `A textbook page teaches these concepts: ${extracted.concepts.join("; ")}.\n\nFrom the topic list below, choose up to 3 topics that best match what the page teaches, with a confidence from 0 to 1. Only include genuinely relevant topics — return an empty list rather than weak matches.\n\n${poolLines}`,
        },
      ],
    });

    const ranked = JSON.parse(firstText(rankResponse)) as { candidates: Candidate[] };
    const byId = new Map(pool.map((t) => [t.id, t]));
    const candidates = ranked.candidates
      .filter((c) => c.confidence >= CONFIDENCE_FLOOR && byId.has(c.topicId))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map((c) => toView(c, byId.get(c.topicId)!));

    return NextResponse.json({
      candidates,
      conceptSummary: extracted.concepts.join("; "),
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "upstream_rate_limited" }, { status: 503 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("snap: anthropic error", err.status, err.message);
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }
    console.error("snap: unexpected error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
