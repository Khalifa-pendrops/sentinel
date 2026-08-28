import type { SentinelEvent } from '@sentinel/event-schema';
import type { Detection } from './types.js';
import { deterministicRules } from './rules.js';

export function runDetection(events: SentinelEvent[]): Detection[] {
  const detections: Detection[] = [];
  for (const event of events) {
    for (const rule of deterministicRules) {
      const result = rule.evaluate(event);
      if (result !== null) {
        detections.push(result);
      }
    }
  }
  return detections;
}
