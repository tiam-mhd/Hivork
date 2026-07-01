import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { encodeStaffSessionCursor } from './staff-session-cursor.js';
import { hashRefreshTokenJti } from './refresh-token-hash.js';
import type {
  IStaffSessionRepository,
  StaffSessionListStatusFilter,
} from './ports/staff-session.repository.port.js';
import type { IAuthTokenService } from './ports/token.port.js';
import type { SessionStatus } from '@hivork/domain';

export type ListStaffSessionsInput = {
  tenantId: string;
  staffId: string;
  cursor?: string;
  limit?: number;
  status?: StaffSessionListStatusFilter;
  currentRefreshToken?: string;
};

export type StaffSessionListEntry = {
  id: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  rememberMe: boolean;
  isCurrent: boolean;
  status: SessionStatus;
};

export type ListStaffSessionsOutput = {
  items: StaffSessionListEntry[];
  nextCursor: string | null;
};

export class ListStaffSessionsUseCase
  implements UseCase<ListStaffSessionsInput, ListStaffSessionsOutput>
{
  constructor(
    private readonly staffSessions: IStaffSessionRepository,
    private readonly tokens: IAuthTokenService,
  ) {}

  async execute(input: ListStaffSessionsInput): Promise<ListStaffSessionsOutput> {
    const limit = input.limit ?? 20;
    if (limit < 1 || limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const currentHash = await this.resolveCurrentRefreshHash(input.currentRefreshToken);

    const page = await this.staffSessions.listForStaff({
      tenantId: input.tenantId,
      staffId: input.staffId,
      cursor: input.cursor,
      limit,
      status: input.status ?? 'active',
    });

    const items = page.items.map((row) => ({
      id: row.id,
      deviceLabel: row.deviceLabel,
      ipAddress: row.ipAddress,
      lastActiveAt: row.lastActiveAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      rememberMe: row.rememberMe,
      isCurrent: currentHash !== null && row.refreshTokenHash === currentHash,
      status: row.status,
    }));

    const last = page.items.at(-1);
    const nextCursor =
      page.hasNext && last
        ? encodeStaffSessionCursor(last.lastActiveAt, last.id)
        : null;

    return { items, nextCursor };
  }

  private async resolveCurrentRefreshHash(refreshToken?: string): Promise<string | null> {
    if (!refreshToken) {
      return null;
    }

    const payload = await this.tokens.verifyRefreshToken(refreshToken);
    if (!payload?.jti) {
      return null;
    }

    return hashRefreshTokenJti(payload.jti);
  }
}
