import { describe, expect, it } from 'vitest';
import { redactEvent, redactPayload, stripQueryString } from '../../packages/redaction/src/redact.js';
import { makeEvent } from '../fixtures/make-event.js';

describe('stripQueryString', () => {
  it('removes the query string', () => {
    expect(stripQueryString('/reset?token=abc123')).toBe('/reset');
  });

  it('removes a fragment', () => {
    expect(stripQueryString('/docs#section')).toBe('/docs');
  });

  it('removes both when both are present', () => {
    expect(stripQueryString('/a?x=1#top')).toBe('/a');
  });

  it('leaves a plain path unchanged', () => {
    expect(stripQueryString('/v1/events')).toBe('/v1/events');
  });

  it('leaves an empty string unchanged', () => {
    expect(stripQueryString('')).toBe('');
  });
});

describe('redactEvent', () => {
  it('strips the query string from action.target', () => {
    const event = makeEvent({ action: { type: 'http.request', category: 'http', target: '/reset?token=abc123' } });
    expect(redactEvent(event).action.target).toBe('/reset');
  });

  it('keeps the rest of the action when stripping', () => {
    const event = makeEvent({ action: { type: 'http.request', category: 'http', target: '/reset?token=abc123' } });
    expect(redactEvent(event).action).toEqual({ type: 'http.request', category: 'http', target: '/reset' });
  });

  it('leaves an event without a target untouched', () => {
    const event = makeEvent();
    const redacted = redactEvent(event);
    expect(redacted.action).toEqual(event.action);
    expect(redacted.action).not.toHaveProperty('target');
  });

  it('does not mutate the original event', () => {
    const event = makeEvent({
      action: { type: 'http.request', category: 'http', target: '/a?x=1' },
      payload: { password: 'hunter2' },
    });
    redactEvent(event);
    expect(event.action.target).toBe('/a?x=1');
    expect(event.payload['password']).toBe('hunter2');
  });

  it('still redacts sensitive payload keys', () => {
    const event = makeEvent({ payload: { password: 'hunter2', note: 'ok' } });
    expect(redactEvent(event).payload).toEqual({ password: '[REDACTED]', note: 'ok' });
  });
});

describe('redactPayload', () => {
  it('redacts sensitive keys at any depth', () => {
    const result = redactPayload({ user: { apiKey: 'k', name: 'n' }, items: [{ token: 't', id: 1 }] });
    expect(result).toEqual({ user: { apiKey: '[REDACTED]', name: 'n' }, items: [{ token: '[REDACTED]', id: 1 }] });
  });

  it('matches keys case-insensitively', () => {
    expect(redactPayload({ Password: 'x', SECRET_VALUE: 'y' })).toEqual({
      Password: '[REDACTED]',
      SECRET_VALUE: '[REDACTED]',
    });
  });

  it('leaves non-sensitive values alone', () => {
    expect(redactPayload({ note: 'ok', count: 3, flag: true })).toEqual({ note: 'ok', count: 3, flag: true });
  });
});
