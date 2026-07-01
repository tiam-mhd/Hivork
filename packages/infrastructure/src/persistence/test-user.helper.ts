import type { PrismaService } from '../prisma/prisma.service.js';

export async function ensureTestUser(
  prisma: PrismaService,
  phone: string,
  name?: string,
) {
  return prisma.user.create({
    data: {
      phone,
      name: name ?? null,
      status: 'active',
    },
  });
}

export async function ensureTestGlobalCustomer(
  prisma: PrismaService,
  phone: string,
  name?: string,
) {
  const user = await ensureTestUser(prisma, phone, name);
  return prisma.globalCustomer.create({
    data: {
      userId: user.id,
      name: name ?? null,
      status: 'active',
    },
  });
}

export async function ensureTestStaff(
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
  const user = await ensureTestUser(prisma, input.phone, input.name);
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
