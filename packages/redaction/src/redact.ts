import type { SentinelEvent } from '@sentinel/event-schema';
import { DEFAULT_SENSITIVE_KEY_PATTERNS, isSensitiveKey } from './patterns.js';

const REDACTED_PLACEHOLDER = '[REDACTED]';

export function redactPayload(payload: Record<string, unknown>, patterns: RegExp[] = DEFAULT_SENSITIVE_KEY_PATTERNS): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(payload)) {
    const value = payload[key];

    if (isSensitiveKey(key, patterns)) {
      result[key] = REDACTED_PLACEHOLDER;
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactPayload(value as Record<string, unknown>, patterns);
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === 'object' ? redactPayload(item as Record<string, unknown>, patterns) : item,
      );
      continue;
    }

    result[key] = value;
  }

  return result;
}

export function stripQueryString(target: string): string {
  const cut = target.search(/[?#]/);
  return cut === -1 ? target : target.slice(0, cut);
}

export function redactEvent(event: SentinelEvent, patterns: RegExp[] = DEFAULT_SENSITIVE_KEY_PATTERNS): SentinelEvent {
  const target = event.action.target;
  const action = target !== undefined ? { ...event.action, target: stripQueryString(target) } : event.action;

  return {
    ...event,
    action,
    payload: redactPayload(event.payload, patterns),
  };
}
