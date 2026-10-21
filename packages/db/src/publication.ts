import type { SentinelEvent } from '@sentinel/event-schema';
import { prisma } from './client.js';

export async function markEventPublished(eventId: string, organizationId: string): Promise<void> {
  await prisma.event.updateMany({
    where: { id: eventId, organizationId, publishedAt: null },
    data: { publishedAt: new Date() },
  });
}

export async function findUnpublishedEvent(eventId: string, organizationId: string): Promise<SentinelEvent | null> {
  const record = await prisma.event.findFirst({
    where: { id: eventId, organizationId, publishedAt: null },
    select: { envelope: true },
  });

  if (record === null || record.envelope === null) {
    return null;
  }

  return record.envelope as unknown as SentinelEvent;
}
