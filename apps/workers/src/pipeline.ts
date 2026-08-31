import type { SentinelEvent } from '@sentinel/event-schema';
import { runDetection } from '@sentinel/detection-engine';
import { correlateDetections, type CorrelatedIncident } from '@sentinel/correlation-engine';
import { buildAttackGraph, type AttackGraph } from '@sentinel/attack-graph';
import { redactEvent } from '@sentinel/redaction';
import { logger } from '@sentinel/shared';

export interface PipelineResult {
  incidents: CorrelatedIncident[];
  graphs: AttackGraph[];
}

export function runPipeline(rawEvents: SentinelEvent[]): PipelineResult {
  const events = rawEvents.map((event) => redactEvent(event));

  const detections = runDetection(events);
  logger.info('detection stage complete', { detectionCount: detections.length });

  const incidents = correlateDetections(detections, events);
  logger.info('correlation stage complete', { incidentCount: incidents.length });

  const graphs = incidents.map((incident) => buildAttackGraph(incident, events));
  logger.info('attack graph stage complete', { graphCount: graphs.length });

  return { incidents, graphs };
}
