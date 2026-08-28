export * from './types.js';
export { SentinelClient } from './client.js';

import { SentinelClient } from './client.js';
import type { SentinelConfig } from './types.js';

export const Sentinel = {
  init(config: SentinelConfig): SentinelClient {
    return new SentinelClient(config);
  },
};
