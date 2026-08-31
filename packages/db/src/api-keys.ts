import { prisma } from './client.js';

export interface ApiKeyLookupResult {
  organizationId: string;
  hashedKey: string;
}

export async function findApiKeyByHash(hashedKey: string): Promise<ApiKeyLookupResult | null> {
  const record = await prisma.apiKey.findUnique({
    where: { hashedKey },
  });

  if (record === null || record.revokedAt !== null) {
    return null;
  }

  return {
    organizationId: record.organizationId,
    hashedKey: record.hashedKey,
  };
}
