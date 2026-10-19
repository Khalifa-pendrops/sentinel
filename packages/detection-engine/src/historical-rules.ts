import { generateId } from '@sentinel/shared';
import type { SentinelEvent } from '@sentinel/event-schema';
import type { Detection } from './types.js';
import type { EventHistory, HistoricalDetectionRule } from './history.js';

export interface RepeatedFailureRuleOptions {
  id: string;
  description: string;
  actionCategory: string;
  outcomeStatus: string;
  threshold: number;
  windowMs: number;
}

export function createRepeatedFailureRule(options: RepeatedFailureRuleOptions): HistoricalDetectionRule {
  return {
    id: options.id,
    description: options.description,
    evaluate: async (event: SentinelEvent, history: EventHistory): Promise<Detection | null> => {
      if (event.action.category !== options.actionCategory || event.outcome.status !== options.outcomeStatus) {
        return null;
      }

      const actorId = event.actor?.id;
      const sourceIp = event.request?.sourceIp;
      const subject = actorId !== undefined ? { actorId } : sourceIp !== undefined ? { sourceIp } : null;
      if (subject === null) {
        return null;
      }

      const count = await history.countRecent({
        organizationId: event.organizationId,
        actionCategory: options.actionCategory,
        outcomeStatus: options.outcomeStatus,
        windowMs: options.windowMs,
        ...subject,
      });

      if (count < options.threshold) {
        return null;
      }

      return {
        id: generateId('det'),
        ruleId: options.id,
        evidenceLevel: 'suspected',
        description:
          count + ' matching events within ' + Math.round(options.windowMs / 60000) + ' minutes (threshold ' + options.threshold + ')',
        sourceEventIds: [event.id],
      };
    },
  };
}

export const repeatedAuthenticationFailureRule = createRepeatedFailureRule({
  id: 'repeated-authentication-failures',
  description: 'Repeated failed authentication attempts from the same actor or source',
  actionCategory: 'authentication',
  outcomeStatus: 'failure',
  threshold: 5,
  windowMs: 10 * 60 * 1000,
});

export const repeatedAuthorizationFailureRule = createRepeatedFailureRule({
  id: 'repeated-authorization-failures',
  description: 'Repeated denied authorization attempts from the same actor',
  actionCategory: 'authorization',
  outcomeStatus: 'blocked',
  threshold: 5,
  windowMs: 10 * 60 * 1000,
});

export const historicalRules = [repeatedAuthenticationFailureRule, repeatedAuthorizationFailureRule];
