import type { SentinelEvent } from '@sentinel/event-schema';
import { runDetection } from '@sentinel/detection-engine';
import { correlateDetections, type CorrelatedIncident } from '@sentinel/correlation-engine';
import { buildAttackGraph, type AttackGraph } from '@sentinel/attack-graph';
import { redactEvent } from '@sentinel/redaction';
import { saveDetections, saveIncident } from '@sentinel/db';
import { logger } from '@sentinel/shared';

export interface PipelineResult {
  incidents: CorrelatedIncident[];
  graphs: AttackGraph[];
}

function assertSingleOrganization(events: SentinelEvent[]): string {
  const firstEvent = events[0];
  if (firstEvent === undefined) {
    throw new Error('cannot run pipeline on an empty event batch');
  }

  const organizationId = firstEvent.organizationId;
  const mismatched = events.find((event) => event.organizationId !== organizationId);
  if (mismatched !== undefined) {
    throw new Error(
      'refusing to process mixed-organization batch: expected ' +
        organizationId +
        ' but found ' +
        mismatched.organizationId,
    );
  }

  return organizationId;
}

export async function runPipeline(rawEvents: SentinelEvent[]): Promise<PipelineResult> {
  const organizationId = assertSingleOrganization(rawEvents);
  const events = rawEvents.map((event) => redactEvent(event));

  const detections = runDetection(events);
  logger.info('detection stage complete', { detectionCount: detections.length });

  if (detections.length > 0) {
    await saveDetections(detections);
  }

  const incidents = correlateDetections(detections, events);
  logger.info('correlation stage complete', { incidentCount: incidents.length });

  for (const incident of incidents) {
    await saveIncident(incident, organizationId);
  }

  const graphs = incidents.map((incident) => buildAttackGraph(incident, events));
  logger.info('attack graph stage complete', { graphCount: graphs.length });

  return { incidents, graphs };
}
