import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  CustomerNoteRecord,
  CustomerNoteRecordWithAuthor,
  ICustomerNoteRepository,
} from '../ports/customer-note.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import {
  assertCanDeleteCustomerNote,
  assertCanUpdateCustomerNote,
} from './customer-note-authorization.js';
import {
  decodeCustomerNoteCursor,
  encodeCustomerNoteCursor,
} from './customer-note-cursor.js';
import { resolveActiveCustomerForDocuments } from './resolve-customer-document-access.js';

type CustomerNotesContext = {
  tenantId: string;
  tenantCustomerId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
};

async function resolveCustomer(
  context: CustomerNotesContext,
  tenantCustomers: ITenantCustomerRepository,
  sales: ISaleRepository,
) {
  return resolveActiveCustomerForDocuments(
    context.tenantId,
    context.tenantCustomerId,
    context.staffContext,
    context.actorId,
    tenantCustomers,
    sales,
  );
}

export type CreateCustomerNoteCommand = CustomerNotesContext & {
  body: string;
  isPinned?: boolean;
  ip?: string;
  userAgent?: string;
};

export type CreateCustomerNoteOutput = CustomerNoteRecord;

export class CreateCustomerNoteUseCase
  implements UseCase<CreateCustomerNoteCommand, CreateCustomerNoteOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly notes: ICustomerNoteRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateCustomerNoteCommand): Promise<CreateCustomerNoteOutput> {
    await resolveCustomer(input, this.tenantCustomers, this.sales);

    const created = await this.notes.create({
      tenantId: input.tenantId,
      tenantCustomerId: input.tenantCustomerId,
      body: input.body,
      authorStaffId: input.actorId,
      createdById: input.actorId,
      isPinned: input.isPinned,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.note.create',
      entityType: 'customer_note',
      entityId: created.id,
      newValue: {
        tenantCustomerId: input.tenantCustomerId,
        isPinned: created.isPinned,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return created;
  }
}

export type ListCustomerNotesInput = CustomerNotesContext & {
  limit?: number;
  cursor?: string;
};

export type ListCustomerNotesOutput = {
  items: CustomerNoteRecordWithAuthor[];
  meta: {
    hasNext: boolean;
    nextCursor: string | null;
  };
};

export class ListCustomerNotesUseCase
  implements UseCase<ListCustomerNotesInput, ListCustomerNotesOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly notes: ICustomerNoteRepository,
  ) {}

  async execute(input: ListCustomerNotesInput): Promise<ListCustomerNotesOutput> {
    await resolveCustomer(input, this.tenantCustomers, this.sales);

    const limit = Math.min(input.limit ?? 20, 50);
    const cursor = input.cursor ? decodeCustomerNoteCursor(input.cursor) : undefined;

    const rows = await this.notes.listByCustomer({
      tenantId: input.tenantId,
      tenantCustomerId: input.tenantCustomerId,
      limit: limit + 1,
      cursor: cursor
        ? {
            isPinned: cursor.isPinned,
            createdAt: new Date(cursor.createdAt),
            id: cursor.id,
          }
        : undefined,
    });

    const hasNext = rows.length > limit;
    const pageItems = hasNext ? rows.slice(0, limit) : rows;
    const lastItem = pageItems.at(-1);

    return {
      items: pageItems,
      meta: {
        hasNext,
        nextCursor:
          hasNext && lastItem
            ? encodeCustomerNoteCursor({
                isPinned: lastItem.isPinned,
                createdAt: lastItem.createdAt,
                id: lastItem.id,
              })
            : null,
      },
    };
  }
}

export type UpdateCustomerNoteCommand = CustomerNotesContext & {
  noteId: string;
  body?: string;
  isPinned?: boolean;
  canUpdateAny: boolean;
  ip?: string;
  userAgent?: string;
};

export type UpdateCustomerNoteOutput = CustomerNoteRecord;

export class UpdateCustomerNoteUseCase
  implements UseCase<UpdateCustomerNoteCommand, UpdateCustomerNoteOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly notes: ICustomerNoteRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateCustomerNoteCommand): Promise<UpdateCustomerNoteOutput> {
    await resolveCustomer(input, this.tenantCustomers, this.sales);

    const existing = await this.notes.findById(input.noteId, input.tenantId);
    if (!existing || existing.tenantCustomerId !== input.tenantCustomerId) {
      throw new ApplicationError('NOTE_NOT_FOUND', 'Customer note was not found.', 404);
    }

    assertCanUpdateCustomerNote({
      note: existing,
      actorId: input.actorId,
      canUpdateAny: input.canUpdateAny,
    });

    const updated = await this.notes.update({
      tenantId: input.tenantId,
      id: input.noteId,
      updatedById: input.actorId,
      body: input.body,
      isPinned: input.isPinned,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.note.update',
      entityType: 'customer_note',
      entityId: updated.id,
      oldValue: {
        body: existing.body,
        isPinned: existing.isPinned,
      },
      newValue: {
        body: updated.body,
        isPinned: updated.isPinned,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return updated;
  }
}

export type DeleteCustomerNoteInput = CustomerNotesContext & {
  noteId: string;
  deleteReason?: string;
  canDeleteAny: boolean;
  ip?: string;
  userAgent?: string;
};

export type DeleteCustomerNoteOutput = {
  id: string;
  deletedAt: Date;
};

export class DeleteCustomerNoteUseCase
  implements UseCase<DeleteCustomerNoteInput, DeleteCustomerNoteOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly notes: ICustomerNoteRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: DeleteCustomerNoteInput): Promise<DeleteCustomerNoteOutput> {
    await resolveCustomer(input, this.tenantCustomers, this.sales);

    const existing = await this.notes.findById(input.noteId, input.tenantId);
    if (!existing || existing.tenantCustomerId !== input.tenantCustomerId) {
      throw new ApplicationError('NOTE_NOT_FOUND', 'Customer note was not found.', 404);
    }

    assertCanDeleteCustomerNote({
      note: existing,
      actorId: input.actorId,
      canDeleteAny: input.canDeleteAny,
    });

    const deleted = await this.notes.softDelete({
      id: input.noteId,
      tenantId: input.tenantId,
      deletedById: input.actorId,
      deleteReason: input.deleteReason,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.note.delete',
      entityType: 'customer_note',
      entityId: deleted.id,
      oldValue: {
        tenantCustomerId: input.tenantCustomerId,
        body: existing.body,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      id: deleted.id,
      deletedAt: deleted.deletedAt!,
    };
  }
}
