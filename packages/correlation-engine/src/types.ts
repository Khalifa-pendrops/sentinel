import type { Detection } from '@sentinel/detection-engine';

export type CorrelationLinkType = 'shared_actor' | 'shared_resource' | 'shared_trace' | 'time_window';

export interface CorrelationLink {
  id: string;
  type: CorrelationLinkType;
  detectionIds: string[];
  evidence: string;
}

export interface CorrelatedIncident {
  id: string;
  detections: Detection[];
  links: CorrelationLink[];
}
