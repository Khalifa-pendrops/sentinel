import { describe, expect, it } from 'vitest';
import {
  authenticationFailureRule,
  authorizationDeniedRule,
  unexpectedApiKeyRule,
} from '../../packages/detection-engine/src/rules.js';
import { runDetection } from '../../packages/detection-engine/src/engine.js';
import { makeEvent } from '../fixtures/make-event.js';

describe('unexpectedApiKeyRule', () => {
  it('flags api_key.create as a confirmed detection', () => {
    const event = makeEvent({ id: 'evt_key', action: { type: 'api_key.create', category: 'iam' } });
    const detection = unexpectedApiKeyRule.evaluate(event);
    expect(detection).not.toBeNull();
    expect(detection?.evidenceLevel).toBe('confirmed');
    expect(detection?.sourceEventIds).toEqual(['evt_key']);
  });

  it('ignores unrelated actions', () => {
    expect(unexpectedApiKeyRule.evaluate(makeEvent())).toBeNull();
  });
});

describe('authenticationFailureRule', () => {
  it('flags a failed authentication as suspected, not confirmed', () => {
    const event = makeEvent({
      id: 'evt_login',
      action: { type: 'login', category: 'authentication' },
      outcome: { status: 'failure' },
    });
    const detection = authenticationFailureRule.evaluate(event);
    expect(detection?.evidenceLevel).toBe('suspected');
    expect(detection?.sourceEventIds).toEqual(['evt_login']);
  });

  it('ignores a successful authentication', () => {
    const event = makeEvent({ action: { type: 'login', category: 'authentication' } });
    expect(authenticationFailureRule.evaluate(event)).toBeNull();
  });

  it('ignores failures outside the authentication category', () => {
    const event = makeEvent({
      action: { type: 'http.request', category: 'http' },
      outcome: { status: 'failure' },
    });
    expect(authenticationFailureRule.evaluate(event)).toBeNull();
  });
});

describe('authorizationDeniedRule', () => {
  it('flags a denied authorization as suspected', () => {
    const event = makeEvent({
      id: 'evt_denied',
      action: { type: 'resource.read', category: 'authorization' },
      outcome: { status: 'blocked' },
    });
    const detection = authorizationDeniedRule.evaluate(event);
    expect(detection?.evidenceLevel).toBe('suspected');
    expect(detection?.sourceEventIds).toEqual(['evt_denied']);
  });

  it('ignores an allowed authorization', () => {
    const event = makeEvent({ action: { type: 'resource.read', category: 'authorization' } });
    expect(authorizationDeniedRule.evaluate(event)).toBeNull();
  });

  it('ignores blocked HTTP requests, since 4xx responses are deliberately not a signal', () => {
    const event = makeEvent({
      action: { type: 'http.request', category: 'http' },
      outcome: { status: 'blocked' },
    });
    expect(authorizationDeniedRule.evaluate(event)).toBeNull();
  });
});

describe('runDetection', () => {
  it('returns one detection per matching event in a mixed batch', () => {
    const events = [
      makeEvent({ id: 'evt_1', action: { type: 'api_key.create', category: 'iam' } }),
      makeEvent({ id: 'evt_2', action: { type: 'login', category: 'authentication' }, outcome: { status: 'failure' } }),
      makeEvent({ id: 'evt_3', action: { type: 'login', category: 'authentication' } }),
      makeEvent({ id: 'evt_4', action: { type: 'http.request', category: 'http' }, outcome: { status: 'failure' } }),
      makeEvent({ id: 'evt_5', action: { type: 'http.request', category: 'http' }, outcome: { status: 'blocked' } }),
    ];
    const detections = runDetection(events);
    expect(detections.map((detection) => detection.ruleId).sort()).toEqual([
      'authentication-failure',
      'unexpected-api-key-created',
    ]);
  });

  it('returns nothing for an empty batch', () => {
    expect(runDetection([])).toEqual([]);
  });
});
