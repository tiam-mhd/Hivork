import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICheckRepository } from '../ports/check.repository.port.js';
import type { ICheckTrackingNoteRepository } from '../ports/check-tracking-note.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertCheckBranchAccess } from './check-access.js';

export type AddCheckTrackingNoteInput = {
  tenantId: string;
  staffId: string;
  checkId: string;
  body: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type AddCheckTrackingNoteResult = {
  note: {
    id: string;
    body: string;
    createdAt: string;
    createdById: string;
  };
};

export class AddCheckTrackingNoteUseCase
  implements UseCase<AddCheckTrackingNoteInput, AddCheckTrackingNoteResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly checks: ICheckRepository,
    private readonly trackingNotes: ICheckTrackingNoteRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
  ) {}

  async execute(input: AddCheckTrackingNoteInput): Promise<AddCheckTrackingNoteResult> {
    const body = input.body.trim();
    if (!body) {
      throw new ApplicationError('FIELD_REQUIRED', 'Note body is required.', 400);
    }

    const check = await this.checks.findById(input.tenantId, input.checkId);
    if (!check) {
      throw new ApplicationError('CHECK_NOT_FOUND', 'Check was not found.', 404);
    }

    await assertCheckBranchAccess(
      this.branches,
      input.tenantId,
      check.branchId,
      input.staffContext,
    );

    const noteId = randomUUID();

    return this.unitOfWork.transaction(async (tx) => {
      const note = await this.trackingNotes.create(
        {
          id: noteId,
          tenantId: input.tenantId,
          checkId: input.checkId,
          body,
          authorStaffId: input.staffId,
          createdById: input.staffId,
        },
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'check.tracking.note',
          entityType: 'check',
          entityId: input.checkId,
          newValue: { body, noteId: note.id },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return {
        note: {
          id: note.id,
          body: note.body,
          createdAt: note.createdAt.toISOString(),
          createdById: note.authorStaffId,
        },
      };
    });
  }
}
