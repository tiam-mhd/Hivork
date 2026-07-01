import type { PrismaService } from '@hivork/infrastructure';

export async function markInstallmentOverdueForTest(
  prisma: PrismaService,
  installmentId: string,
  tenantId: string,
  daysAgo = 7,
): Promise<void> {
  const pastDue = new Date();
  pastDue.setUTCDate(pastDue.getUTCDate() - daysAgo);
  pastDue.setUTCHours(12, 0, 0, 0);

  await prisma.installment.update({
    where: { id: installmentId, tenantId },
    data: {
      status: 'OVERDUE',
      dueDate: pastDue,
    },
  });
}
