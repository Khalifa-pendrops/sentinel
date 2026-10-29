import { generateId } from '@sentinel/shared';
import type { SentinelEvent } from '@sentinel/event-schema';
import type { Detection } from './types.js';
import type { BaselineHistory, BaselineRule } from './baseline.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface UnseenEndpointRuleOptions {
  id: string;
  description: string;
  windowMs: number;
  lagMs: number;
  minSamples: number;
}

export function createUnseenEndpointRule(options: UnseenEndpointRuleOptions): BaselineRule {
  return {
    id: options.id,
    description: options.description,
    evaluate: async (event: SentinelEvent, history: BaselineHistory): Promise<Detection | null> => {
      const target = event.action.target;
      if (event.action.category !== 'http' || target === undefined) {
        return null;
      }

      const scope = {
        organizationId: event.organizationId,
        integrationId: event.source.integrationId,
        actionCategory: 'http',
        windowMs: options.windowMs,
        lagMs: options.lagMs,
      };

      const total = await history.countBaseline(scope);
      if (total < options.minSamples) {
        return null;
      }

      const seen = await history.countBaseline({ ...scope, actionTarget: target });
      if (seen > 0) {
        return null;
      }

      return {
        id: generateId('det'),
        ruleId: options.id,
        evidenceLevel: 'suspected',
        description: 'Endpoint ' + target + ' has not been seen in the baseline window',
        sourceEventIds: [event.id],
      };
    },
  };
}

export const unseenEndpointRule = createUnseenEndpointRule({
  id: 'unseen-endpoint',
  description: 'A request reached an endpoint not seen in this integration baseline',
  windowMs: 14 * DAY_MS,
  lagMs: HOUR_MS,
  minSamples: 50,
});

export const baselineRules = [unseenEndpointRule];
