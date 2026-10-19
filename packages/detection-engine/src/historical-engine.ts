import type { SentinelEvent } from '@sentinel/event-schema';
import type { Detection } from './types.js';
import type { EventHistory, HistoricalDetectionRule } from './history.js';
import { historicalRules } from './historical-rules.js';

export async function runHistoricalDetection(
  events: SentinelEvent[],
  history: EventHistory,
  rules: HistoricalDetectionRule[] = historicalRules,
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
