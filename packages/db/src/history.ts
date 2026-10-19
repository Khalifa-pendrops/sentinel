import { prisma } from './client.js';

export interface CountRecentEventsParams {
  organizationId: string;
  actionCategory: string;
  outcomeStatus: string;
  since: Date;
  actorId?: string;
  sourceIp?: string;
}

export async function countRecentEvents(params: CountRecentEventsParams): Promise<number> {
  return prisma.event.count({
    where: {
      organizationId: params.organizationId,
      actionCategory: params.actionCategory,
      outcomeStatus: params.outcomeStatus,
      ingestedAt: { gte: params.since },
      ...(params.actorId !== undefined ? { actorId: params.actorId } : {}),
      ...(params.sourceIp !== undefined ? { sourceIp: params.sourceIp } : {}),
    },
  });
}
