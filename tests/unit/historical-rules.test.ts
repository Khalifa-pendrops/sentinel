import { describe, expect, it } from 'vitest';
import type { EventHistory, HistoryQuery } from '../../packages/detection-engine/src/history.js';
import {
  createRepeatedFailureRule,
  repeatedAuthenticationFailureRule,
  repeatedAuthorizationFailureRule,
} from '../../packages/detection-engine/src/historical-rules.js';
import { runHistoricalDetection } from '../../packages/detection-engine/src/historical-engine.js';
import { makeEvent } from '../fixtures/make-event.js';

function fakeHistory(count: number): { history: EventHistory; queries: HistoryQuery[] } {
  const queries: HistoryQuery[] = [];
  const history: EventHistory = {
    countRecent: async (query: HistoryQuery): Promise<number> => {
      queries.push(query);
      return count;
    },
  };
  return { history, queries };
}

const failedLogin = makeEvent({
  id: 'evt_login',
  actor: { type: 'user', id: 'user_1' },
  action: { type: 'login', category: 'authentication' },
  outcome: { status: 'failure' },
});

const deniedAccess = makeEvent({
  id: 'evt_denied',
  actor: { type: 'user', id: 'user_2' },
  action: { type: 'resource.read', category: 'authorization' },
  outcome: { status: 'blocked' },
});

describe('repeatedAuthenticationFailureRule', () => {
  it('fires as suspected once the count reaches the threshold', async () => {
    const { history } = fakeHistory(5);
    const detection = await repeatedAuthenticationFailureRule.evaluate(failedLogin, history);
    expect(detection?.ruleId).toBe('repeated-authentication-failures');
    expect(detection?.evidenceLevel).toBe('suspected');
    expect(detection?.sourceEventIds).toEqual(['evt_login']);
  });

  it('stays quiet one below the threshold', async () => {
    const { history } = fakeHistory(4);
    expect(await repeatedAuthenticationFailureRule.evaluate(failedLogin, history)).toBeNull();
  });

  it('groups by actor when the event has one', async () => {
    const { history, queries } = fakeHistory(5);
    await repeatedAuthenticationFailureRule.evaluate(failedLogin, history);
    expect(queries).toHaveLength(1);
    expect(queries[0]?.actorId).toBe('user_1');
    expect(queries[0]?.sourceIp).toBeUndefined();
  });

  it('falls back to the source IP when no actor is known', async () => {
    const event = makeEvent({
      action: { type: 'login', category: 'authentication' },
      outcome: { status: 'failure' },
      request: { sourceIp: '203.0.113.7' },
    });
    const { history, queries } = fakeHistory(5);
    await repeatedAuthenticationFailureRule.evaluate(event, history);
    expect(queries[0]?.sourceIp).toBe('203.0.113.7');
    expect(queries[0]?.actorId).toBeUndefined();
  });

  it('does not query history when neither actor nor source IP is known', async () => {
    const event = makeEvent({
      action: { type: 'login', category: 'authentication' },
      outcome: { status: 'failure' },
    });
    const { history, queries } = fakeHistory(5);
    expect(await repeatedAuthenticationFailureRule.evaluate(event, history)).toBeNull();
    expect(queries).toHaveLength(0);
  });

  it('does not query history for events outside its category and outcome', async () => {
    const { history, queries } = fakeHistory(5);
    const successfulLogin = makeEvent({ action: { type: 'login', category: 'authentication' } });
    expect(await repeatedAuthenticationFailureRule.evaluate(makeEvent(), history)).toBeNull();
    expect(await repeatedAuthenticationFailureRule.evaluate(successfulLogin, history)).toBeNull();
    expect(queries).toHaveLength(0);
  });

  it('scopes the history query to the event organization and its own window', async () => {
    const event = makeEvent({
      organizationId: 'org_other',
      actor: { type: 'user', id: 'user_1' },
      action: { type: 'login', category: 'authentication' },
      outcome: { status: 'failure' },
    });
    const { history, queries } = fakeHistory(5);
    await repeatedAuthenticationFailureRule.evaluate(event, history);
    expect(queries[0]).toMatchObject({
      organizationId: 'org_other',
      actionCategory: 'authentication',
      outcomeStatus: 'failure',
      windowMs: 600000,
    });
  });
});

describe('repeatedAuthorizationFailureRule', () => {
  it('counts denied authorizations', async () => {
    const { history, queries } = fakeHistory(6);
    const detection = await repeatedAuthorizationFailureRule.evaluate(deniedAccess, history);
    expect(detection?.ruleId).toBe('repeated-authorization-failures');
    expect(queries[0]).toMatchObject({ actionCategory: 'authorization', outcomeStatus: 'blocked' });
  });
});

describe('createRepeatedFailureRule', () => {
  it('honours a custom threshold and window', async () => {
    const rule = createRepeatedFailureRule({
      id: 'custom',
      description: 'custom',
      actionCategory: 'authentication',
      outcomeStatus: 'failure',
      threshold: 2,
      windowMs: 60000,
    });
    const { history, queries } = fakeHistory(2);
    const detection = await rule.evaluate(failedLogin, history);
    expect(detection?.ruleId).toBe('custom');
    expect(queries[0]?.windowMs).toBe(60000);
  });
});

describe('runHistoricalDetection', () => {
  it('runs every rule against every event and combines the results', async () => {
    const { history } = fakeHistory(5);
    const detections = await runHistoricalDetection([failedLogin, deniedAccess], history);
    expect(detections.map((detection) => detection.ruleId).sort()).toEqual([
      'repeated-authentication-failures',
      'repeated-authorization-failures',
    ]);
  });

  it('returns nothing for an empty batch', async () => {
    const { history, queries } = fakeHistory(5);
    expect(await runHistoricalDetection([], history)).toEqual([]);
    expect(queries).toHaveLength(0);
  });
});
