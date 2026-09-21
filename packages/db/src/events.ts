import { Prisma, type Event as PrismaEvent } from '@prisma/client';
import type { SentinelEvent } from '@sentinel/event-schema';
import { prisma } from './client.js';

export async function saveEvent(event: SentinelEvent): Promise<{ created: boolean }> {
  try {
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
    return { created: true };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { created: false };
    }
    throw error;
  }
}

export interface ListEventsParams {
  organizationId: string;
  actionType?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  cursor?: string;
}

export interface ListEventsResult {
  events: PrismaEvent[];
  nextCursor: string | null;
}

export async function listEvents(params: ListEventsParams): Promise<ListEventsResult> {
  const limit = params.limit !== undefined && params.limit > 0 && params.limit <= 100 ? params.limit : 25;

  const timestampFilter: Prisma.DateTimeFilter<'Event'> = {};
  if (params.since !== undefined) {
    timestampFilter.gte = params.since;
  }
  if (params.until !== undefined) {
    timestampFilter.lte = params.until;
  }

  const where: Prisma.EventWhereInput = {
    organizationId: params.organizationId,
  };
  if (params.actionType !== undefined) {
    where.actionType = params.actionType;
  }
  if (params.since !== undefined || params.until !== undefined) {
    where.timestamp = timestampFilter;
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit + 1,
    ...(params.cursor !== undefined ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = events.length > limit;
  const page = hasMore ? events.slice(0, limit) : events;
  const lastEvent = page[page.length - 1];
  const nextCursor = hasMore && lastEvent !== undefined ? lastEvent.id : null;

  return { events: page, nextCursor };
}
