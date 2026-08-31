import { randomBytes } from 'node:crypto';
import { hashApiKey } from '@sentinel/auth';
import { prisma } from './client.js';

async function seed(): Promise<void> {
  const salt = process.env['SENTINEL_INGESTION_API_KEY_SALT'];
  if (salt === undefined || salt.length === 0) {
    throw new Error('SENTINEL_INGESTION_API_KEY_SALT is not set');
  }

  const rawKey = 'sk_dev_' + randomBytes(24).toString('hex');
  const hashedKey = hashApiKey(rawKey, salt);

  const organization = await prisma.organization.create({
    data: { name: 'Dev Org' },
  });

  await prisma.apiKey.create({
    data: {
      organizationId: organization.id,
      hashedKey,
      label: 'local dev key',
    },
  });

  console.log('Organization created:', organization.id);
  console.log('Raw API key (save this, it is not stored anywhere):', rawKey);
}

seed()
  .then(() => prisma.$disconnect())
  .catch((err: unknown) => {
    console.error(err);
    return prisma.$disconnect();
  });
