import { NextRequest, NextResponse } from "next/server";
import { getAllTopics, getTopicTranslation, getSubjects, getSubjectZh } from "@/lib/taxonomy";
import { getVisionProvider, type RankedCandidate } from "@/lib/vision";
import { authEnabled, currentUserId } from "@/auth";
import { consumeSnapQuota } from "@/lib/store";
import type { Topic } from "@/lib/types";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DAILY_LIMIT = 20;
const CONFIDENCE_FLOOR = 0.3;

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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

// Fallback limiter for the auth-not-configured deployment mode.
const ipUsage = new Map<string, { day: string; count: number }>();

function ipRateLimited(ip: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = ipUsage.get(ip);
  if (!entry || entry.day !== day) {
    ipUsage.set(ip, { day, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > DAILY_LIMIT;
}

function toView(c: RankedCandidate, topic: Topic): CandidateView {
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

/** Demo mode — no vision provider configured. Returns the PRD's validated
 * example (the 貨幣的演進 textbook page → "What Money Is") so the full UI
 * flow is testable end-to-end before an LLM key is connected. */
function demoResponse(): NextResponse {
  const byId = new Map(getAllTopics().map((t) => [t.id, t]));
  const demo: RankedCandidate[] = [
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

export async function POST(req: NextRequest) {
  // Quota: per-user when auth is live, per-IP before credentials are set.
  if (authEnabled) {
    const userId = await currentUserId();
    if (!userId) {
      return NextResponse.json({ error: "login_required" }, { status: 401 });
    }
    if (await consumeSnapQuota(userId, DAILY_LIMIT)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  } else {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (ipRateLimited(ip)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
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

  const provider = getVisionProvider();
  if (!provider) {
    return demoResponse();
  }

  const subjects = getSubjects();

  try {
    // Stage 1: what does this page teach?
    const extracted = await provider.extract(mediaType, base64Data, subjects);

    if (!extracted.readable || extracted.concepts.length === 0) {
      return NextResponse.json({ candidates: [], conceptSummary: "" });
    }

    // Filter candidates by subject and age band before the re-rank. When the
    // page's subject has no counterpart in the taxonomy (e.g. 社會), rank
    // across all subjects rather than an arbitrary slice — capping keeps the
    // most age-relevant topics, not the first ones in file order.
    const allTopics = getAllTopics();
    const age = body.profileAge;
    const minAge = Math.min(extracted.gradeHint.minAge, age ?? Infinity) - 1;
    const maxAge = Math.max(extracted.gradeHint.maxAge, age ?? -Infinity) + 1;
    const subjectValid = subjects.includes(extracted.subject);
    let pool = allTopics.filter(
      (t) =>
        (!subjectValid || t.subject === extracted.subject) &&
        t.ageRangeStart <= maxAge &&
        t.ageRangeEnd >= minAge
    );
    if (pool.length === 0) {
      pool = subjectValid ? allTopics.filter((t) => t.subject === extracted.subject) : allTopics;
    }
    const midAge = (extracted.gradeHint.minAge + extracted.gradeHint.maxAge) / 2;
    pool = [...pool]
      .sort(
        (a, b) =>
          Math.abs((a.ageRangeStart + a.ageRangeEnd) / 2 - midAge) -
          Math.abs((b.ageRangeStart + b.ageRangeEnd) / 2 - midAge)
      )
      .slice(0, 400);

    console.log(
      `snap: provider=${provider.name} subject=${JSON.stringify(extracted.subject)} valid=${subjectValid} ` +
        `concepts=${JSON.stringify(extracted.concepts)} grade=${extracted.gradeHint.minAge}-${extracted.gradeHint.maxAge} pool=${pool.length}`
    );

    // Stage 2: re-rank the pool against the extracted concepts.
    const poolLines = pool
      .map((t) => `${t.id} | ${t.name} | ages ${t.ageRangeStart}-${t.ageRangeEnd} | ${t.description.slice(0, 160)}`)
      .join("\n");

    const ranked = await provider.rank(extracted.concepts, poolLines);
    console.log(`snap: ranked=${JSON.stringify(ranked)}`);
    const byId = new Map(pool.map((t) => [t.id, t]));
    const candidates = ranked
      .filter((c) => c.confidence >= CONFIDENCE_FLOOR && byId.has(c.topicId))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map((c) => toView(c, byId.get(c.topicId)!));

    return NextResponse.json({
      candidates,
      conceptSummary: extracted.concepts.join("; "),
    });
  } catch (err) {
    console.error(`snap: ${provider.name} error`, err);
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
