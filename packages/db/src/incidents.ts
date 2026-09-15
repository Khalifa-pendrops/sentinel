import type { CorrelatedIncident } from '@sentinel/correlation-engine';
import { prisma } from './client.js';

export async function saveIncident(incident: CorrelatedIncident, organizationId: string): Promise<void> {
  await prisma.incident.create({
    data: {
      id: incident.id,
      organizationId,
    },
  });

  const detectionIds = incident.detections.map((detection) => detection.id);
  await prisma.detection.updateMany({
    where: { id: { in: detectionIds } },
    data: { incidentId: incident.id },
  });
}
