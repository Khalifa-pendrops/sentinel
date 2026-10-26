export function expressRoutePattern(baseUrl: string, routePath: unknown): string | undefined {
  return typeof routePath === 'string' ? baseUrl + routePath : undefined;
}

export function endpointTarget(route: string | undefined, path: string): string {
  return route !== undefined && route !== '' ? route : path;
}
