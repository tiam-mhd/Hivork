import { afterAll, describe, expect, it } from 'vitest';

import {
  CreateCustomerNoteUseCase,
  DeleteCustomerNoteUseCase,
  ListCustomerNotesUseCase,
  UpdateCustomerNoteUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaCustomerNoteRepository } from './customer-note.repository.js';
import { PrismaSaleRepository } from './sale.repository.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ensureTestGlobalCustomer } from './test-user.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('Customer notes CRUD (integration)', () => {
  const prisma = new PrismaService();
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const notes = new PrismaCustomerNoteRepository(prisma);
  const audit = new PrismaAuditService(prisma);

  const createNote = new CreateCustomerNoteUseCase(tenantCustomers, sales, notes, audit);
  const listNotes = new ListCustomerNotesUseCase(tenantCustomers, sales, notes);
  const updateNote = new UpdateCustomerNoteUseCase(tenantCustomers, sales, notes, audit);
  const deleteNote = new DeleteCustomerNoteUseCase(tenantCustomers, sales, notes, audit);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates, lists, updates, and soft-deletes a note', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: { staff: { where: { deletedAt: null }, take: 1 } },
    });
    if (!tenant?.staff[0]) {
      throw new Error('demo-shop staff required');
    }

    const phone = `0915${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Notes Customer');
    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
      },
    });

    const staffContext = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [],
      activeBranchId: null,
    };

    const created = await createNote.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      actorId: tenant.staff[0].id,
      staffContext,
      body: 'یادداشت اول',
      isPinned: true,
    });

    const listed = await listNotes.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      actorId: tenant.staff[0].id,
      staffContext,
      limit: 10,
    });

    expect(listed.items[0]?.id).toBe(created.id);
    expect(listed.items[0]?.isPinned).toBe(true);

    const updated = await updateNote.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      noteId: created.id,
      actorId: tenant.staff[0].id,
      staffContext,
      body: 'یادداشت ویرایش‌شده',
      canUpdateAny: false,
    });

    expect(updated.body).toBe('یادداشت ویرایش‌شده');

    const deleted = await deleteNote.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      noteId: created.id,
      actorId: tenant.staff[0].id,
      staffContext,
      canDeleteAny: false,
    });

    expect(deleted.id).toBe(created.id);

    const afterDelete = await listNotes.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      actorId: tenant.staff[0].id,
      staffContext,
    });

    expect(afterDelete.items).toHaveLength(0);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('rejects update after 24h window for author without elevated permission', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        staff: { where: { deletedAt: null }, take: 1 },
        tenantCustomers: { where: { deletedAt: null }, take: 1 },
      },
    });
    if (!tenant?.staff[0] || !tenant.tenantCustomers[0]) {
      throw new Error('demo-shop data required');
    }

    const note = await prisma.customerNote.create({
      data: {
        tenantId: tenant.id,
        tenantCustomerId: tenant.tenantCustomers[0].id,
        body: 'قدیمی',
        authorStaffId: tenant.staff[0].id,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        createdById: tenant.staff[0].id,
        updatedById: tenant.staff[0].id,
      },
    });

    await expect(
      updateNote.execute({
        tenantId: tenant.id,
        tenantCustomerId: tenant.tenantCustomers[0].id,
        noteId: note.id,
        actorId: tenant.staff[0].id,
        staffContext: {
          staffId: tenant.staff[0].id,
          dataScope: 'all',
          assignedBranchIds: [],
          activeBranchId: null,
        },
        body: 'تلاش دیرهنگام',
        canUpdateAny: false,
      }),
    ).rejects.toMatchObject({ code: 'NOTE_EDIT_WINDOW_EXPIRED' });

    await prisma.customerNote.update({
      where: { id: note.id },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
  });
});
