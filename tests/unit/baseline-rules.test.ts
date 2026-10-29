import { describe, expect, it } from 'vitest';
import type { BaselineHistory, BaselineQuery } from '../../packages/detection-engine/src/baseline.js';
import { createUnseenEndpointRule, unseenEndpointRule } from '../../packages/detection-engine/src/baseline-rules.js';
import { runBaselineDetection } from '../../packages/detection-engine/src/baseline-engine.js';
import { makeEvent } from '../fixtures/make-event.js';

function fakeBaseline(total: number, seen: number): { history: BaselineHistory; queries: BaselineQuery[] } {
  const queries: BaselineQuery[] = [];
  const history: BaselineHistory = {
    countBaseline: async (query: BaselineQuery): Promise<number> => {
      queries.push(query);
      return query.actionTarget === undefined ? total : seen;
    },
  };
  return { history, queries };
}

const adminRequest = makeEvent({
  id: 'evt_http',
  source: { type: 'application', integrationId: 'demo-app' },
  action: { type: 'http.request', category: 'http', target: '/admin/export' },
});

describe('unseenEndpointRule', () => {
  it('fires as suspected when the baseline is mature and the endpoint is new', async () => {
    const { history } = fakeBaseline(100, 0);
    const detection = await unseenEndpointRule.evaluate(adminRequest, history);
    expect(detection?.ruleId).toBe('unseen-endpoint');
    expect(detection?.evidenceLevel).toBe('suspected');
    expect(detection?.sourceEventIds).toEqual(['evt_http']);
    expect(detection?.description).toContain('/admin/export');
  });

  it('stays quiet when the endpoint has been seen before', async () => {
    const { history } = fakeBaseline(100, 3);
    expect(await unseenEndpointRule.evaluate(adminRequest, history)).toBeNull();
  });

  it('stays quiet and skips the endpoint query when the baseline is too small', async () => {
    const { history, queries } = fakeBaseline(49, 0);
    expect(await unseenEndpointRule.evaluate(adminRequest, history)).toBeNull();
    expect(queries).toHaveLength(1);
  });

  it('fires when the baseline holds exactly the minimum sample', async () => {
    const { history } = fakeBaseline(50, 0);
    expect(await unseenEndpointRule.evaluate(adminRequest, history)).not.toBeNull();
  });

  it('ignores events outside the http category without querying', async () => {
    const { history, queries } = fakeBaseline(100, 0);
    const login = makeEvent({ action: { type: 'login', category: 'authentication', target: '/auth/login' } });
    expect(await unseenEndpointRule.evaluate(login, history)).toBeNull();
    expect(queries).toHaveLength(0);
  });

  it('ignores http events that have no target without querying', async () => {
    const { history, queries } = fakeBaseline(100, 0);
    const noTarget = makeEvent({ action: { type: 'http.request', category: 'http' } });
    expect(await unseenEndpointRule.evaluate(noTarget, history)).toBeNull();
    expect(queries).toHaveLength(0);
  });

  it('scopes both queries to the organization, integration, category and its own window', async () => {
    const { history, queries } = fakeBaseline(100, 0);
    await unseenEndpointRule.evaluate(adminRequest, history);
    expect(queries[0]).toMatchObject({
      organizationId: 'org_test',
      integrationId: 'demo-app',
      actionCategory: 'http',
      windowMs: 1209600000,
      lagMs: 3600000,
    });
    expect(queries[0]?.actionTarget).toBeUndefined();
    expect(queries[1]?.actionTarget).toBe('/admin/export');
  });

  it('honours custom options', async () => {
    const rule = createUnseenEndpointRule({ id: 'custom', description: 'custom', windowMs: 1000, lagMs: 10, minSamples: 2 });
    const { history, queries } = fakeBaseline(2, 0);
    const detection = await rule.evaluate(adminRequest, history);
    expect(detection?.ruleId).toBe('custom');
    expect(queries[0]).toMatchObject({ windowMs: 1000, lagMs: 10 });
  });
});

describe('runBaselineDetection', () => {
  it('runs the rules against every event and combines the results', async () => {
    const { history } = fakeBaseline(100, 0);
    const second = makeEvent({
      id: 'evt_http_2',
      source: { type: 'application', integrationId: 'demo-app' },
      action: { type: 'http.request', category: 'http', target: '/internal/debug' },
    });
    const detections = await runBaselineDetection([adminRequest, second], history);
    expect(detections.map((detection) => detection.sourceEventIds[0])).toEqual(['evt_http', 'evt_http_2']);
  });

  it('returns nothing for an empty batch', async () => {
    const { history, queries } = fakeBaseline(100, 0);
    expect(await runBaselineDetection([], history)).toEqual([]);
    expect(queries).toHaveLength(0);
  });
});
