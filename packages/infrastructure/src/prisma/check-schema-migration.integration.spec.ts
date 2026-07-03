import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { PrismaService } from './prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('check_schema migration (IFP-111 integration)', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function loadDemoContext() {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    const staff = await prisma.staff.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });

    return { tenant, branch, staff };
  }

  it('inserts received and payable checks', async () => {
    const { tenant, branch, staff } = await loadDemoContext();
    const dueDate = new Date('2026-10-01T12:00:00.000Z');

    const received = await prisma.check.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        checkType: 'RECEIVED',
        status: 'REGISTERED',
        checkNumber: `RCV-${Date.now()}`,
        bankName: 'ملت',
        amountRial: 12_000_000n,
        dueDate,
        drawerName: 'علی رضایی',
        payeeName: 'فروشگاه نمونه',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    const payable = await prisma.check.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        checkType: 'PAYABLE',
        status: 'REGISTERED',
        checkNumber: `PAY-${Date.now()}`,
        bankName: 'ملی',
        amountRial: 8_500_000n,
        dueDate,
        drawerName: 'فروشگاه نمونه',
        payeeName: 'تأمین‌کننده الف',
        sayadId: '1234567890123456',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    expect(received.checkType).toBe('RECEIVED');
    expect(payable.checkType).toBe('PAYABLE');
    expect(received.amountRial).toBe(12_000_000n);
    expect(payable.sayadId).toBe('1234567890123456');
  });

  it('allows duplicate check number after soft delete', async () => {
    const { tenant, branch, staff } = await loadDemoContext();
    const checkNumber = `DUP-${randomUUID().slice(0, 8)}`;
    const dueDate = new Date('2026-11-01T12:00:00.000Z');

    const first = await prisma.check.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        checkType: 'RECEIVED',
        checkNumber,
        bankName: 'سپه',
        amountRial: 1_000_000n,
        dueDate,
        drawerName: 'اول',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    await prisma.check.update({
      where: { id: first.id },
      data: {
        deletedAt: new Date(),
        deletedById: staff.id,
        deleteReason: 'test soft delete',
      },
    });

    const second = await prisma.check.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        checkType: 'RECEIVED',
        checkNumber,
        bankName: 'سپه',
        amountRial: 2_000_000n,
        dueDate,
        drawerName: 'دوم',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    expect(second.id).not.toBe(first.id);
    expect(second.deletedAt).toBeNull();
  });
});
