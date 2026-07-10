import topicsData from "../../data/topics.json";
import dependenciesData from "../../data/dependencies.json";
import clustersData from "../../data/clusters.json";
import type { Topic, Dependency, Cluster } from "./types";

const topics = topicsData.topics as Topic[];
const dependencies = dependenciesData.dependencies as Dependency[];
const clusters = clustersData.clusters as Cluster[];

const topicsById = new Map<string, Topic>(topics.map((t) => [t.id, t]));

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

export function getSubjects(): string[] {
  return Array.from(new Set(topics.map((t) => t.subject))).sort();
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
  strength: "hard" | "soft";
  reason: string;
}

export function getPrerequisites(id: string): RelatedTopic[] {
  const deps = prereqsByTopic.get(id) ?? [];
  return deps
    .map((d) => {
      const topic = topicsById.get(d.prerequisiteId);
      return topic ? { topic, strength: d.strength, reason: d.reason } : null;
    })
    .filter((x): x is RelatedTopic => x !== null);
}

export function getUnlocks(id: string): RelatedTopic[] {
  const deps = unlocksByTopic.get(id) ?? [];
  return deps
    .map((d) => {
      const topic = topicsById.get(d.topicId);
      return topic ? { topic, strength: d.strength, reason: d.reason } : null;
    })
    .filter((x): x is RelatedTopic => x !== null);
}

export function getClusterSummary(subject: string, domain: string, age: number): string | undefined {
  const candidates = clusters.filter((c) => c.subject === subject && c.domain === domain);
  if (candidates.length === 0) return undefined;
  // pick the closest age band at or below the requested age, falling back to the youngest
  const sorted = [...candidates].sort((a, b) => a.ageRangeStart - b.ageRangeStart);
  const match = [...sorted].reverse().find((c) => c.ageRangeStart <= age);
  return (match ?? sorted[0]).summary;
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
