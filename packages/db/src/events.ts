import type { Prisma } from '@prisma/client';
import type { SentinelEvent } from '@sentinel/event-schema';
import { prisma } from './client.js';

export async function saveEvent(event: SentinelEvent): Promise<void> {
  await prisma.event.create({
    data: {
      id: event.id,
      organizationId: event.organizationId,
      sourceType: event.source.type,
      actorId: event.actor?.id ?? null,
      resourceId: event.resource?.id ?? null,
      actionType: event.action.type,
      outcomeStatus: event.outcome.status,
      confidence: event.confidence,
      payload: event.payload as Prisma.InputJsonValue,
      timestamp: new Date(event.timestamp),
    },
  });
}
