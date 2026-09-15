import type { Detection } from '@sentinel/detection-engine';
import { prisma } from './client.js';

export async function saveDetections(detections: Detection[]): Promise<void> {
  for (const detection of detections) {
    await prisma.detection.create({
      data: {
        id: detection.id,
        ruleId: detection.ruleId,
        evidenceLevel: detection.evidenceLevel,
        description: detection.description,
        sourceEvents: {
          create: detection.sourceEventIds.map((eventId) => ({ eventId })),
        },
      },
    });
  }
}
