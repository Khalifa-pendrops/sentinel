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

export const authenticationFailureRule: DetectionRule = {
  id: 'authentication-failure',
  description: 'An authentication attempt failed',
  evaluate: (event) => {
    if (event.action.category !== 'authentication' || event.outcome.status !== 'failure') {
      return null;
    }
    return {
      id: generateId('det'),
      ruleId: 'authentication-failure',
      evidenceLevel: 'suspected',
      description: 'Failed authentication attempt observed',
      sourceEventIds: [event.id],
    };
  },
};

export const authorizationDeniedRule: DetectionRule = {
  id: 'authorization-denied',
  description: 'An authorization check denied access',
  evaluate: (event) => {
    if (event.action.category !== 'authorization' || event.outcome.status !== 'blocked') {
      return null;
    }
    return {
      id: generateId('det'),
      ruleId: 'authorization-denied',
      evidenceLevel: 'suspected',
      description: 'Denied authorization attempt observed',
      sourceEventIds: [event.id],
    };
  },
};

export const deterministicRules = [unexpectedApiKeyRule, authenticationFailureRule, authorizationDeniedRule];
