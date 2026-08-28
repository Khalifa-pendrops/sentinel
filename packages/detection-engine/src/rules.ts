import { generateId } from '@sentinel/shared';
import type { DetectionRule } from './types.js';

export const unexpectedApiKeyRule: DetectionRule = {
  id: 'unexpected-api-key-created',
  description: 'An API key was created outside of a known deployment workflow',
  evaluate: (event) => {
    if (event.action.type !== 'api_key.create') {
      return null;
    }
    return {
      id: generateId('det'),
      ruleId: 'unexpected-api-key-created',
      evidenceLevel: 'confirmed',
      description: 'API key creation event observed',
      sourceEventIds: [event.id],
    };
  },
};

export const deterministicRules = [unexpectedApiKeyRule];
