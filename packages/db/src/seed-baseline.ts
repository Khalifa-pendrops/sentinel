import { prisma } from './client.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const BASELINE_ENDPOINTS = ['/health', '/users/:id', '/orders', '/orders/:id', '/login'];
const BASELINE_COUNT = 60;

interface SeedEvent {
  id: string;
  target: string;
  at: Date;
}

async function seedBaseline(): Promise<void> {
  const organizationId = process.env['SENTINEL_ORGANIZATION_ID'];
  if (organizationId === undefined || organizationId.length === 0) {
    throw new Error('SENTINEL_ORGANIZATION_ID is not set');
  }

  const integrationId = process.env['BASELINE_INTEGRATION'] ?? 'baseline-test';
  const now = Date.now();
  const flaggedEventId = 'evt_seed_' + integrationId + '_flagged';

  const routine: SeedEvent[] = Array.from({ length: BASELINE_COUNT }, (_unused, index) => ({
    id: 'evt_seed_' + integrationId + '_' + index,
    target: BASELINE_ENDPOINTS[index % BASELINE_ENDPOINTS.length] ?? '/health',
    at: new Date(now - 2 * DAY_MS + index * MINUTE_MS),
  }));

  const extras: SeedEvent[] = [
    { id: 'evt_seed_' + integrationId + '_legacy', target: '/legacy-report', at: new Date(now - 3 * HOUR_MS) },
    { id: flaggedEventId, target: '/flagged-earlier', at: new Date(now - 3 * HOUR_MS) },
  ];

  const created = await prisma.event.createMany({
    data: [...routine, ...extras].map((seed) => ({
      id: seed.id,
      organizationId,
      sourceType: 'application',
      integrationId,
      actionType: 'http.request',
      actionCategory: 'http',
      actionTarget: seed.target,
      outcomeStatus: 'success',
      confidence: 1,
      payload: {},
      timestamp: seed.at,
      ingestedAt: seed.at,
      publishedAt: seed.at,
    })),
    skipDuplicates: true,
  });

  await prisma.detection.upsert({
    where: { id: 'det_seed_' + integrationId + '_flagged' },
    update: {},
    create: {
      id: 'det_seed_' + integrationId + '_flagged',
      ruleId: 'unseen-endpoint',
      evidenceLevel: 'suspected',
      description: 'Seeded earlier detection for /flagged-earlier',
      sourceEvents: { create: [{ eventId: flaggedEventId }] },
    },
  });

  console.log('Inserted ' + created.count + ' events for integration ' + integrationId);
}

seedBaseline()
  .then(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    return prisma.$disconnect();
  });
