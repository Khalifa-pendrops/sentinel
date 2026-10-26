import { describe, expect, it } from 'vitest';
import { endpointTarget, expressRoutePattern } from '../../packages/sdk-node/src/endpoint.js';

describe('expressRoutePattern', () => {
  it('joins the mount path and the route pattern', () => {
    expect(expressRoutePattern('/api', '/users/:id')).toBe('/api/users/:id');
  });

  it('uses the route pattern alone when mounted at the root', () => {
    expect(expressRoutePattern('', '/users/:id')).toBe('/users/:id');
  });

  it('returns undefined when the route is not a string pattern', () => {
    expect(expressRoutePattern('', undefined)).toBeUndefined();
    expect(expressRoutePattern('', /^x/)).toBeUndefined();
  });
});

describe('endpointTarget', () => {
  it('prefers the route pattern over the raw path', () => {
    expect(endpointTarget('/users/:id', '/users/42')).toBe('/users/:id');
  });

  it('falls back to the raw path when no route matched', () => {
    expect(endpointTarget(undefined, '/wp-admin')).toBe('/wp-admin');
  });

  it('treats an empty route as unmatched', () => {
    expect(endpointTarget('', '/x')).toBe('/x');
  });
});
