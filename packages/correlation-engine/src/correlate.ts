import { generateId } from '@sentinel/shared';
import type { SentinelEvent } from '@sentinel/event-schema';
import type { Detection } from '@sentinel/detection-engine';
import type { CorrelationLink, CorrelatedIncident, CorrelationLinkType } from './types.js';

const TIME_WINDOW_MS = 5 * 60 * 1000;

function eventsForDetection(detection: Detection, eventsById: Map<string, SentinelEvent>): SentinelEvent[] {
  const events: SentinelEvent[] = [];
  for (const eventId of detection.sourceEventIds) {
    const event = eventsById.get(eventId);
    if (event !== undefined) {
      events.push(event);
    }
  }
  return events;
}

function findSharedEventId(left: Detection, right: Detection): string | undefined {
  return left.sourceEventIds.find((id) => right.sourceEventIds.includes(id));
}

function findSharedActorId(leftEvents: SentinelEvent[], rightEvents: SentinelEvent[]): string | undefined {
  const leftIds = leftEvents.map((e) => e.actor?.id).filter((id): id is string => id !== undefined);
  const rightIds = rightEvents.map((e) => e.actor?.id).filter((id): id is string => id !== undefined);
  return leftIds.find((id) => rightIds.includes(id));
}

function findSharedResourceId(leftEvents: SentinelEvent[], rightEvents: SentinelEvent[]): string | undefined {
  const leftIds = leftEvents.map((e) => e.resource?.id).filter((id): id is string => id !== undefined);
  const rightIds = rightEvents.map((e) => e.resource?.id).filter((id): id is string => id !== undefined);
  return leftIds.find((id) => rightIds.includes(id));
}

function findTimeWindowMatch(leftEvents: SentinelEvent[], rightEvents: SentinelEvent[]): string | undefined {
  for (const leftEvent of leftEvents) {
    const leftTime = Date.parse(leftEvent.timestamp);
    for (const rightEvent of rightEvents) {
      const rightTime = Date.parse(rightEvent.timestamp);
      if (Math.abs(leftTime - rightTime) <= TIME_WINDOW_MS) {
        return leftEvent.id + ' and ' + rightEvent.id;
      }
    }
  }
  return undefined;
}

function buildLink(type: CorrelationLinkType, detectionIds: string[], evidence: string): CorrelationLink {
  return { id: generateId('link'), type, detectionIds, evidence };
}

export function correlateDetections(detections: Detection[], events: SentinelEvent[]): CorrelatedIncident[] {
  const eventsById = new Map<string, SentinelEvent>();
  for (const event of events) {
    eventsById.set(event.id, event);
  }

  const links: CorrelationLink[] = [];

  for (let i = 0; i < detections.length; i += 1) {
    for (let j = i + 1; j < detections.length; j += 1) {
      const left = detections[i];
      const right = detections[j];
      if (left === undefined || right === undefined) {
        continue;
      }

      const leftEvents = eventsForDetection(left, eventsById);
      const rightEvents = eventsForDetection(right, eventsById);

      const sharedEventId = findSharedEventId(left, right);
      if (sharedEventId !== undefined) {
        links.push(buildLink('shared_trace', [left.id, right.id], 'shared source event ' + sharedEventId));
      }

      const sharedActorId = findSharedActorId(leftEvents, rightEvents);
      if (sharedActorId !== undefined) {
        links.push(buildLink('shared_actor', [left.id, right.id], 'shared actor ' + sharedActorId));
      }

      const sharedResourceId = findSharedResourceId(leftEvents, rightEvents);
      if (sharedResourceId !== undefined) {
        links.push(buildLink('shared_resource', [left.id, right.id], 'shared resource ' + sharedResourceId));
      }

      const timeWindowMatch = findTimeWindowMatch(leftEvents, rightEvents);
      if (timeWindowMatch !== undefined) {
        links.push(buildLink('time_window', [left.id, right.id], 'events within time window: ' + timeWindowMatch));
      }
    }
  }

  if (links.length === 0) {
    return [];
  }

  return [{ id: generateId('incident'), detections, links }];
}
