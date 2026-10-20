import { countRecentEvents } from '@sentinel/db';
import type { EventHistory, HistoryQuery } from '@sentinel/detection-engine';

export const databaseHistory: EventHistory = {
  countRecent: async (query: HistoryQuery): Promise<number> =>
    countRecentEvents({
      organizationId: query.organizationId,
      actionCategory: query.actionCategory,
      outcomeStatus: query.outcomeStatus,
      since: new Date(Date.now() - query.windowMs),
      ...(query.actorId !== undefined ? { actorId: query.actorId } : {}),
      ...(query.sourceIp !== undefined ? { sourceIp: query.sourceIp } : {}),
    }),
};
