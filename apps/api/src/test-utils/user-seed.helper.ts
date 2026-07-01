import type { PrismaService } from '@hivork/infrastructure';

export type SeedStaff = {
  id: string;
  tenantId: string;
  userId: string;
  phone: string;
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
};

export async function ensureUser(
  prisma: PrismaService,
  phone: string,
  name?: string,
): Promise<{ id: string; phone: string }> {
  const user = await prisma.user.upsert({
    where: { phone },
    create: { phone, name: name ?? null, status: 'active' },
    update: { name: name ?? undefined, deletedAt: null },
  });

  return { id: user.id, phone: user.phone };
}

export async function ensureGlobalCustomer(
  prisma: PrismaService,
  phone: string,
  name?: string,
) {
  const user = await ensureUser(prisma, phone, name);
  const existing = await prisma.globalCustomer.findFirst({
    where: { userId: user.id, deletedAt: null },
  });
  if (existing) return existing;

  return prisma.globalCustomer.create({
    data: {
      userId: user.id,
      name: name ?? null,
      status: 'active',
    },
  });
}

export async function ensureStaff(
  prisma: PrismaService,
  input: {
    tenantId: string;
    phone: string;
    name: string;
    dataScope?: 'all' | 'branch' | 'own';
    assignedBranchIds?: string[];
    primaryBranchId?: string | null;
  },
) {
  const user = await ensureUser(prisma, input.phone, input.name);
  return prisma.staff.create({
    data: {
      tenantId: input.tenantId,
      userId: user.id,
      name: input.name,
      status: 'active',
      dataScope: input.dataScope ?? 'all',
      assignedBranchIds: input.assignedBranchIds ?? [],
      primaryBranchId: input.primaryBranchId ?? null,
    },
  });
}
