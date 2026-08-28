import type { SentinelEvent } from '@sentinel/event-schema';

export function isValidSentinelEvent(body: unknown): body is SentinelEvent {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const candidate = body as Record<string, unknown>;
  if (typeof candidate['id'] !== 'string') return false;
  if (typeof candidate['organizationId'] !== 'string') return false;
  if (typeof candidate['timestamp'] !== 'string') return false;
  if (typeof candidate['source'] !== 'object' || candidate['source'] === null) return false;
  if (typeof candidate['action'] !== 'object' || candidate['action'] === null) return false;
  if (typeof candidate['outcome'] !== 'object' || candidate['outcome'] === null) return false;
  if (typeof candidate['confidence'] !== 'number') return false;
  return true;
}
