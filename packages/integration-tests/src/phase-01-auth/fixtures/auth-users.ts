import type { PrismaClient } from '@prisma/client';

export {
  seedPhase01AuthFixture,
  softDeleteTestApiKeys,
  PHASE01_DEFAULT_PASSWORD,
  type Phase01Fixtures,
  type Phase01StaffFixture,
  type Phase01ViewerFixture,
} from '../../../../../prisma/seed/phase-01-auth.js';

export async function seedPhase01AuthFixtureForTests(
  prisma: PrismaClient,
): Promise<import('../../../../../prisma/seed/phase-01-auth.js').Phase01Fixtures> {
  const { seedPhase01AuthFixture } = await import('../../../../../prisma/seed/phase-01-auth.js');
  return seedPhase01AuthFixture(prisma);
}
