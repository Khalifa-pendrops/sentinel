import type { SentinelEvent } from '@sentinel/event-schema';
import type { GcpConnectorConfig } from './types.js';

export function pollApiKeyActivity(config: GcpConnectorConfig): SentinelEvent[] {
  const events: SentinelEvent[] = [];
  void config;
  return events;
}
