import topicsData from "../../data/topics.json";
import dependenciesData from "../../data/dependencies.json";
import clustersData from "../../data/clusters.json";
import topicsZhData from "../../data/topics.zh-tw.json";
import dependenciesZhData from "../../data/dependencies.zh-tw.json";
import clustersZhData from "../../data/clusters.zh-tw.json";
import subjectsDomainsZhData from "../../data/subjects-domains.zh-tw.json";
import type { Topic, Dependency, Cluster, TopicTranslation } from "./types";
import type { TopicSummary } from "./progress";

const topics = topicsData.topics as Topic[];
const dependencies = dependenciesData.dependencies as Dependency[];
const clusters = clustersData.clusters as Cluster[];

const topicsZh = topicsZhData as Record<string, TopicTranslation>;
const dependenciesZh = dependenciesZhData as Record<string, string>;
const clustersZh = clustersZhData as Record<string, string>;
const subjectsDomainsZh = subjectsDomainsZhData as {
  subjects: Record<string, string>;
  domains: Record<string, string>;
};

const topicsById = new Map<string, Topic>(topics.map((t) => [t.id, t]));

const depKey = (topicId: string, prerequisiteId: string) => `${topicId}|${prerequisiteId}`;
const clusterKey = (subject: string, domain: string, ageRangeStart: number) =>
  `${subject}|${domain}|${ageRangeStart}`;
const domainKey = (subject: string, domain: string) => `${subject}|${domain}`;

const prereqsByTopic = new Map<string, Dependency[]>();
const unlocksByTopic = new Map<string, Dependency[]>();
for (const dep of dependencies) {
  if (!prereqsByTopic.has(dep.topicId)) prereqsByTopic.set(dep.topicId, []);
  prereqsByTopic.get(dep.topicId)!.push(dep);

  if (!unlocksByTopic.has(dep.prerequisiteId)) unlocksByTopic.set(dep.prerequisiteId, []);
  unlocksByTopic.get(dep.prerequisiteId)!.push(dep);
}

export function getAllTopics(): Topic[] {
  return topics;
}

export function getTopic(id: string): Topic | undefined {
  return topicsById.get(id);
}

export function getTopicTranslation(id: string): TopicTranslation | undefined {
  return topicsZh[id];
}

/** Lightweight per-topic fields for client-side progress computation —
 * avoids shipping the full topics.json (names/descriptions/evidence text)
 * into the client bundle just to know subject/age/evidence-count. */
export function getTopicSummaries(): TopicSummary[] {
  return topics.map((t) => ({
    id: t.id,
    subject: t.subject,
    ageRangeStart: t.ageRangeStart,
    evidenceCount: t.evidence.length,
  }));
}

export function getSubjects(): string[] {
  return Array.from(new Set(topics.map((t) => t.subject))).sort();
}

export function getSubjectZh(subject: string): string | undefined {
  return subjectsDomainsZh.subjects[subject];
}

export function getDomainZh(subject: string, domain: string): string | undefined {
  return subjectsDomainsZh.domains[domainKey(subject, domain)];
}

export function getDomains(subject: string): string[] {
  return Array.from(
    new Set(topics.filter((t) => t.subject === subject).map((t) => t.domain))
  ).sort();
}

export function getTopicsBySubject(subject: string): Topic[] {
  return topics
    .filter((t) => t.subject === subject)
    .sort((a, b) => a.ageRangeStart - b.ageRangeStart || a.name.localeCompare(b.name));
}

export function getTopicsByDomain(subject: string, domain: string): Topic[] {
  return topics
    .filter((t) => t.subject === subject && t.domain === domain)
    .sort((a, b) => a.ageRangeStart - b.ageRangeStart || a.name.localeCompare(b.name));
}

export interface RelatedTopic {
  topic: Topic;
  topicNameZh?: string;
  strength: "hard" | "soft";
  reason: string;
  reasonZh?: string;
}

export function getPrerequisites(id: string): RelatedTopic[] {
  const deps = prereqsByTopic.get(id) ?? [];
  return deps
    .map((d): RelatedTopic | null => {
      const topic = topicsById.get(d.prerequisiteId);
      if (!topic) return null;
      return {
        topic,
        topicNameZh: topicsZh[topic.id]?.name,
        strength: d.strength,
        reason: d.reason,
        reasonZh: dependenciesZh[depKey(d.topicId, d.prerequisiteId)],
      };
    })
    .filter((x): x is RelatedTopic => x !== null);
}

export function getUnlocks(id: string): RelatedTopic[] {
  const deps = unlocksByTopic.get(id) ?? [];
  return deps
    .map((d): RelatedTopic | null => {
      const topic = topicsById.get(d.topicId);
      if (!topic) return null;
      return {
        topic,
        topicNameZh: topicsZh[topic.id]?.name,
        strength: d.strength,
        reason: d.reason,
        reasonZh: dependenciesZh[depKey(d.topicId, d.prerequisiteId)],
      };
    })
    .filter((x): x is RelatedTopic => x !== null);
}

export interface ClusterSummary {
  summary: string;
  summaryZh?: string;
}

export function getClusterSummary(
  subject: string,
  domain: string,
  age: number
): ClusterSummary | undefined {
  const candidates = clusters.filter((c) => c.subject === subject && c.domain === domain);
  if (candidates.length === 0) return undefined;
  // pick the closest age band at or below the requested age, falling back to the youngest
  const sorted = [...candidates].sort((a, b) => a.ageRangeStart - b.ageRangeStart);
  const match = (
    [...sorted].reverse().find((c) => c.ageRangeStart <= age) ?? sorted[0]
  );
  return {
    summary: match.summary,
    summaryZh: clustersZh[clusterKey(match.subject, match.domain, match.ageRangeStart)],
  };
}

export function searchTopics(query: string): Topic[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return topics
    .filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q)
    )
    .slice(0, 30);
}
