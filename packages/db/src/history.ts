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

export interface CountBaselineEventsParams {
  organizationId: string;
  integrationId: string;
  actionCategory: string;
  from: Date;
  to: Date;
  actionTarget?: string;
}

export async function countBaselineEvents(params: CountBaselineEventsParams): Promise<number> {
  return prisma.event.count({
    where: {
      organizationId: params.organizationId,
      integrationId: params.integrationId,
      actionCategory: params.actionCategory,
      ingestedAt: { gte: params.from, lt: params.to },
      detectionLinks: { none: {} },
      ...(params.actionTarget !== undefined ? { actionTarget: params.actionTarget } : {}),
    },
  });
}
