import type { SentinelEvent } from '@sentinel/event-schema';
import type { Detection } from './types.js';
import type { BaselineHistory, BaselineRule } from './baseline.js';
import { baselineRules } from './baseline-rules.js';

export async function runBaselineDetection(
  events: SentinelEvent[],
  history: BaselineHistory,
  rules: BaselineRule[] = baselineRules,
): Promise<Detection[]> {
  const detections: Detection[] = [];
  for (const event of events) {
    for (const rule of rules) {
      const result = await rule.evaluate(event, history);
      if (result !== null) {
        detections.push(result);
      }
    }
  }
  return detections;
}
