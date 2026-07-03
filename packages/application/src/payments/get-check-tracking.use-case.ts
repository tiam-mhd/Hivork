import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICheckRepository } from '../ports/check.repository.port.js';
import type { ICheckTrackingNoteRepository } from '../ports/check-tracking-note.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertCheckBranchAccess } from './check-access.js';
import { mapAuditRecordToTimelineEvent } from './check-tracking.mapper.js';

export type GetCheckTrackingInput = {
  tenantId: string;
  checkId: string;
  staffContext: DataScopeStaffContext;
};

export type GetCheckTrackingResult = {
  checkId: string;
  timeline: ReturnType<typeof mapAuditRecordToTimelineEvent>[];
  followUpNotes: Array<{
    id: string;
    body: string;
    createdAt: string;
    createdById: string;
  }>;
};

export class GetCheckTrackingUseCase
  implements UseCase<GetCheckTrackingInput, GetCheckTrackingResult>
{
  constructor(
    private readonly checks: ICheckRepository,
    private readonly trackingNotes: ICheckTrackingNoteRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
  ) {}

  async execute(input: GetCheckTrackingInput): Promise<GetCheckTrackingResult> {
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

    const auditRows = await this.audit.find({
      tenantId: input.tenantId,
      entityType: 'check',
      entityId: input.checkId,
      limit: 100,
    });

    const timeline = auditRows
      .filter((row) => row.action.startsWith('check.'))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(mapAuditRecordToTimelineEvent);

    const notes = await this.trackingNotes.listByCheckId(input.tenantId, input.checkId);

    return {
      checkId: input.checkId,
      timeline,
      followUpNotes: notes.map((note) => ({
        id: note.id,
        body: note.body,
        createdAt: note.createdAt.toISOString(),
        createdById: note.authorStaffId,
      })),
    };
  }
}
