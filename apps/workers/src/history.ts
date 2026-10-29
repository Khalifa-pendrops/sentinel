import { countBaselineEvents, countRecentEvents } from '@sentinel/db';
import type { BaselineHistory, BaselineQuery, EventHistory, HistoryQuery } from '@sentinel/detection-engine';

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

export const databaseBaselineHistory: BaselineHistory = {
  countBaseline: async (query: BaselineQuery): Promise<number> => {
    const now = Date.now();
    return countBaselineEvents({
      organizationId: query.organizationId,
      integrationId: query.integrationId,
      actionCategory: query.actionCategory,
      from: new Date(now - query.windowMs),
      to: new Date(now - query.lagMs),
      ...(query.actionTarget !== undefined ? { actionTarget: query.actionTarget } : {}),
    });
  },
};
