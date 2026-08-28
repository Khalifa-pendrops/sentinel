import { createHash, timingSafeEqual } from 'node:crypto';

export interface ApiKeyValidationResult {
  valid: boolean;
  organizationId?: string;
}

export function hashApiKey(rawKey: string, salt: string): string {
  return createHash('sha256').update(salt + rawKey).digest('hex');
}

export function verifyApiKey(rawKey: string, salt: string, storedHash: string): boolean {
  const candidateHash = hashApiKey(rawKey, salt);
  const candidateBuffer = Buffer.from(candidateHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');
  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }
  return timingSafeEqual(candidateBuffer, storedBuffer);
}
