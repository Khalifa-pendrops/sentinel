import type { SentinelEvent } from '@sentinel/event-schema';
import { DEFAULT_SENSITIVE_KEY_PATTERNS, isSensitiveKey } from './patterns.js';

const REDACTED_PLACEHOLDER = '[REDACTED]';

function redactValue(value: unknown, patterns: RegExp[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, patterns));
  }

  if (value !== null && typeof value === 'object') {
    return redactPayload(value as Record<string, unknown>, patterns);
  }

  return value;
}

export function redactPayload(payload: Record<string, unknown>, patterns: RegExp[] = DEFAULT_SENSITIVE_KEY_PATTERNS): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(payload)) {
    result[key] = isSensitiveKey(key, patterns) ? REDACTED_PLACEHOLDER : redactValue(payload[key], patterns);
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
