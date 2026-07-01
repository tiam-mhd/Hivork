import type { PrismaClient } from '@prisma/client';

const DEMO_OWNER_PHONE = process.env.SEED_OWNER_PHONE ?? '09120000000';

/** Remove leftover integration-test staff/branches so plan limits do not block reruns. */
export async function cleanupDemoTenantTestArtifacts(
  prisma: PrismaClient,
  tenantId: string,
): Promise<void> {
  const now = new Date();

  const ownerUser = await prisma.user.findFirst({
    where: { phone: DEMO_OWNER_PHONE, deletedAt: null },
    select: { id: true },
  });

  if (ownerUser) {
    await prisma.staff.updateMany({
      where: {
        tenantId,
        deletedAt: null,
        userId: { not: ownerUser.id },
      },
      data: {
        deletedAt: now,
        deleteReason: 'integration-test-cleanup',
      },
    });
  }

  await prisma.branch.updateMany({
    where: {
      tenantId,
      deletedAt: null,
      isDefault: false,
    },
    data: {
      deletedAt: now,
      deleteReason: 'integration-test-cleanup',
    },
  });
}
