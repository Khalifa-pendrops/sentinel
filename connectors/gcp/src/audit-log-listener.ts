import { generateId } from '@sentinel/shared';
import type { SentinelEvent } from '@sentinel/event-schema';
import type { GcpConnectorConfig } from './types.js';

export function pollAuditLogs(config: GcpConnectorConfig): SentinelEvent[] {
  const events: SentinelEvent[] = [];
  void config;
  return events;
}
