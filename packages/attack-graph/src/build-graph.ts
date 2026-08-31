import { generateId } from '@sentinel/shared';
import type { SentinelEvent } from '@sentinel/event-schema';
import type { CorrelatedIncident } from '@sentinel/correlation-engine';
import type { AttackGraph, GraphNode, GraphEdge } from './types.js';

function eventsForDetection(detectionSourceEventIds: string[], eventsById: Map<string, SentinelEvent>): SentinelEvent[] {
  const events: SentinelEvent[] = [];
  for (const eventId of detectionSourceEventIds) {
    const event = eventsById.get(eventId);
    if (event !== undefined) {
      events.push(event);
    }
  }
  return events;
}

export function buildAttackGraph(incident: CorrelatedIncident, events: SentinelEvent[]): AttackGraph {
  const eventsById = new Map<string, SentinelEvent>();
  for (const event of events) {
    eventsById.set(event.id, event);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seenActorNodeIds = new Set<string>();
  const seenResourceNodeIds = new Set<string>();

  for (const detection of incident.detections) {
    nodes.push({ id: detection.id, type: 'detection', label: detection.description });

    const relatedEvents = eventsForDetection(detection.sourceEventIds, eventsById);
    for (const event of relatedEvents) {
      if (event.actor?.id !== undefined) {
        const actorNodeId = 'actor_' + event.actor.id;
        if (!seenActorNodeIds.has(actorNodeId)) {
          seenActorNodeIds.add(actorNodeId);
          nodes.push({ id: actorNodeId, type: 'actor', label: event.actor.id });
        }
        edges.push({
          id: generateId('edge'),
          source: detection.id,
          target: actorNodeId,
          evidence: 'detection involves actor ' + event.actor.id,
        });
      }

      if (event.resource?.id !== undefined) {
        const resourceNodeId = 'resource_' + event.resource.id;
        if (!seenResourceNodeIds.has(resourceNodeId)) {
          seenResourceNodeIds.add(resourceNodeId);
          nodes.push({ id: resourceNodeId, type: 'resource', label: event.resource.id });
        }
        edges.push({
          id: generateId('edge'),
          source: detection.id,
          target: resourceNodeId,
          evidence: 'detection involves resource ' + event.resource.id,
        });
      }
    }
  }

  for (const link of incident.links) {
    const sourceId = link.detectionIds[0];
    const targetId = link.detectionIds[1];
    edges.push({
      id: generateId('edge'),
      source: sourceId ?? '',
      target: targetId ?? '',
      evidence: link.evidence,
    });
  }

  return { incidentId: incident.id, nodes, edges };
}
