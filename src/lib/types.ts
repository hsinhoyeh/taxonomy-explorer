export type TopicType =
  | "CONCEPTUAL"
  | "PROCEDURAL"
  | "REPRESENTATIONAL"
  | "LANGUAGE"
  | "META";

export interface Topic {
  id: string;
  type: TopicType;
  subject: string;
  domain: string;
  name: string;
  description: string;
  ageRangeStart: number;
  ageRangeEnd: number;
  centrality: number;
  evidence: string[];
  assessmentPrompt: string;
  standards?: string[];
}

export interface Dependency {
  topicId: string;
  prerequisiteId: string;
  strength: "hard" | "soft";
  reason: string;
}

export interface Cluster {
  subject: string;
  domain: string;
  ageRangeStart: number;
  summary: string;
}
