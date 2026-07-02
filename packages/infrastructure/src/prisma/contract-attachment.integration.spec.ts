import { randomUUID } from 'node:crypto';

import { ContractAttachmentType } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { PrismaContractAttachmentRepository } from '../persistence/contract-attachment.repository.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';
import { PrismaService } from './prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;

async function probeDatabase(): Promise<boolean> {
  if (!databaseUrl) {
    return false;
  }

  const probe = new PrismaService();
  try {
    await probe.$connect();
    await probe.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.$disconnect().catch(() => undefined);
  }
}

const dbAvailable = await probeDatabase();
const describeIfDb = dbAvailable ? describe : describe.skip;

describeIfDb('ContractAttachment (IFP-057 integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaContractAttachmentRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createSaleFixture() {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    const staff = await prisma.staff.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    const phone = `0912${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Contract Attachment Customer');
    const tenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `CA-${Date.now()}`,
      },
    });

    const sale = await prisma.sale.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        branchId: branch.id,
        tenantCustomerId: tenantCustomer.id,
        createdByStaffId: staff.id,
        totalAmountRial: 12_000_000n,
        downPaymentRial: 0n,
        installmentCount: 2,
        firstDueDate: new Date('2026-08-01'),
        contractDate: new Date('2026-07-01'),
      },
    });

    return { tenant, staff, sale };
  }

  it('attaches a file to a sale', async () => {
    const { tenant, staff, sale } = await createSaleFixture();
    const fileId = randomUUID();

    const attachment = await repository.create({
      id: randomUUID(),
      tenantId: tenant.id,
      saleId: sale.id,
      fileId,
      attachmentType: ContractAttachmentType.CONTRACT_SCAN,
      label: 'Signed scan',
      createdById: staff.id,
    });

    expect(attachment.fileId).toBe(fileId);
    expect(attachment.saleId).toBe(sale.id);

    const listed = await repository.listBySale({ tenantId: tenant.id, saleId: sale.id });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(attachment.id);
  });

  it('excludes soft-deleted attachments from list', async () => {
    const { tenant, staff, sale } = await createSaleFixture();
    const attachment = await repository.create({
      id: randomUUID(),
      tenantId: tenant.id,
      saleId: sale.id,
      fileId: randomUUID(),
      attachmentType: ContractAttachmentType.OTHER,
      createdById: staff.id,
    });

    await repository.softDelete({
      id: attachment.id,
      tenantId: tenant.id,
      deletedById: staff.id,
      deleteReason: 'wrong file uploaded',
    });

    const listed = await repository.listBySale({ tenantId: tenant.id, saleId: sale.id });
    expect(listed).toHaveLength(0);
    expect(await repository.countActiveBySale(tenant.id, sale.id)).toBe(0);
  });

  it('restores a soft-deleted attachment', async () => {
    const { tenant, staff, sale } = await createSaleFixture();
    const attachment = await repository.create({
      id: randomUUID(),
      tenantId: tenant.id,
      saleId: sale.id,
      fileId: randomUUID(),
      attachmentType: ContractAttachmentType.SIGNED_CONTRACT,
      createdById: staff.id,
    });

    await repository.softDelete({
      id: attachment.id,
      tenantId: tenant.id,
      deletedById: staff.id,
      deleteReason: 'temporary removal',
    });

    const restored = await repository.restore({
      id: attachment.id,
      tenantId: tenant.id,
      restoredById: staff.id,
    });

    expect(restored.deletedAt).toBeNull();
    expect(restored.deletedById).toBeNull();

    const listed = await repository.listBySale({ tenantId: tenant.id, saleId: sale.id });
    expect(listed).toHaveLength(1);
  });

  it('isolates attachments by tenant (cross-tenant saleId fails)', async () => {
    const { tenant, staff, sale } = await createSaleFixture();
    const otherTenant = await prisma.tenant.findFirst({
      where: { slug: { not: 'demo-shop' }, deletedAt: null },
    });

    const attachment = await repository.create({
      id: randomUUID(),
      tenantId: tenant.id,
      saleId: sale.id,
      fileId: randomUUID(),
      attachmentType: ContractAttachmentType.IDENTITY_DOC,
      createdById: staff.id,
    });

    if (otherTenant) {
      const crossTenantList = await repository.listBySale({
        tenantId: otherTenant.id,
        saleId: sale.id,
      });
      expect(crossTenantList).toHaveLength(0);

      await expect(
        repository.create({
          id: randomUUID(),
          tenantId: otherTenant.id,
          saleId: sale.id,
          fileId: randomUUID(),
          attachmentType: ContractAttachmentType.OTHER,
          createdById: staff.id,
        }),
      ).rejects.toMatchObject({ code: 'SALE_NOT_FOUND' });
    }

    await expect(
      repository.softDelete({
        id: attachment.id,
        tenantId: otherTenant?.id ?? randomUUID(),
        deletedById: staff.id,
      }),
    ).rejects.toMatchObject({ code: 'ATTACHMENT_NOT_FOUND' });
  });
});
