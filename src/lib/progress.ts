"use client";

import { evidenceStorageKey } from "@/lib/profiles";

export interface TopicSummary {
  id: string;
  subject: string;
  ageRangeStart: number;
  evidenceCount: number;
}

export interface SubjectProgress {
  subject: string;
  mastered: number;
  total: number;
  percent: number;
}

function isTopicMastered(profileId: string, topic: TopicSummary): boolean {
  const raw = window.localStorage.getItem(evidenceStorageKey(profileId, topic.id));
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length === topic.evidenceCount && parsed.every(Boolean);
  } catch {
    return false;
  }
}

/** Age-appropriate = the topic's start age has already been reached, so it's
 * part of the curriculum a child this age is expected to have encountered —
 * not "in range", since a topic stays relevant to revisit past its end age. */
export function computeSubjectProgress(
  profileId: string,
  age: number,
  topics: TopicSummary[]
): SubjectProgress[] {
  const bySubject = new Map<string, { mastered: number; total: number }>();
  for (const topic of topics) {
    if (topic.ageRangeStart > age) continue;
    const bucket = bySubject.get(topic.subject) ?? { mastered: 0, total: 0 };
    bucket.total += 1;
    if (isTopicMastered(profileId, topic)) bucket.mastered += 1;
    bySubject.set(topic.subject, bucket);
  }
  return Array.from(bySubject.entries())
    .map(([subject, { mastered, total }]) => ({
      subject,
      mastered,
      total,
      percent: total ? Math.round((mastered / total) * 100) : 0,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}
