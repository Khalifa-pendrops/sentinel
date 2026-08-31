export const DEFAULT_SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /ssn/i,
  /social[_-]?security/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /private[_-]?key/i,
];

export function isSensitiveKey(key: string, patterns: RegExp[] = DEFAULT_SENSITIVE_KEY_PATTERNS): boolean {
  return patterns.some((pattern) => pattern.test(key));
}
