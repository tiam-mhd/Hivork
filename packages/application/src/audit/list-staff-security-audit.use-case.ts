import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { encodeStaffSecurityAuditCursor } from './staff-security-audit-cursor.js';
import type {
  IStaffSecurityAuditRepository,
  StaffSecurityAuditListItem,
} from './ports/staff-security-audit.repository.port.js';

export type ListStaffSecurityAuditInput = {
  tenantId: string;
  staffId: string;
  cursor?: string;
  limit?: number;
};

export type ListStaffSecurityAuditOutput = {
  items: Array<{
    id: string;
    action: string;
    createdAt: string;
    ipAddress: string | null;
    metadata: Record<string, unknown> | undefined;
  }>;
  nextCursor: string | null;
};

export class ListStaffSecurityAuditUseCase
  implements UseCase<ListStaffSecurityAuditInput, ListStaffSecurityAuditOutput>
{
  constructor(private readonly auditRepository: IStaffSecurityAuditRepository) {}

  async execute(input: ListStaffSecurityAuditInput): Promise<ListStaffSecurityAuditOutput> {
    const limit = input.limit ?? 20;
    if (limit < 1 || limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const page = await this.auditRepository.listForStaff({
      tenantId: input.tenantId,
      staffId: input.staffId,
      cursor: input.cursor,
      limit,
    });

    const items = page.items.map((row) => mapItem(row));
    const last = page.items.at(-1);
    const nextCursor =
      page.hasNext && last
        ? encodeStaffSecurityAuditCursor(last.createdAt, last.id)
        : null;

    return { items, nextCursor };
  }
}

function mapItem(row: StaffSecurityAuditListItem) {
  return {
    id: row.id,
    action: row.action,
    createdAt: row.createdAt.toISOString(),
    ipAddress: row.ipAddress,
    metadata: row.metadata,
  };
}
