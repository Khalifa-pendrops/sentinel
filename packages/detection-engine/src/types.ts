import type { EvidenceLevel, SentinelEvent } from '@sentinel/event-schema';

export interface Detection {
  id: string;
  ruleId: string;
  evidenceLevel: EvidenceLevel;
  description: string;
  sourceEventIds: string[];
}

export interface DetectionRule {
  id: string;
  description: string;
  evaluate: (event: SentinelEvent) => Detection | null;
}
