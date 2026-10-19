import type { SentinelEvent } from '@sentinel/event-schema';

export function makeEvent(overrides: Partial<SentinelEvent> = {}): SentinelEvent {
  return {
    id: 'evt_test',
    organizationId: 'org_test',
    timestamp: '2026-10-09T10:00:00.000Z',
    ingestionTimestamp: '2026-10-09T10:00:01.000Z',
    source: { type: 'application', integrationId: 'test-app' },
    action: { type: 'test.action', category: 'test' },
    outcome: { status: 'success' },
    confidence: 1,
    payload: {},
    ...overrides,
  };
}
