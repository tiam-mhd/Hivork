import { StaffSession } from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { hashRefreshTokenJti } from './refresh-token-hash.js';
import {
  calculateStaffSessionExpiresAt,
  DEFAULT_MAX_STAFF_SESSIONS,
} from './staff-session-ttl.js';
import type { IDeviceLabelParser, IStaffSessionRepository } from './ports/staff-session.repository.port.js';

export type CreateStaffSessionInput = {
  tenantId: string;
  staffId: string;
  userId: string;
  refreshTokenJti: string;
  rememberMe: boolean;
  deviceId?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
  maxSessions?: number;
  refreshTtlSeconds: number;
  refreshSessionTtlSeconds: number;
  createdById?: string;
};

export type CreateStaffSessionOutput = {
  sessionId: string;
};

export class CreateStaffSessionUseCase
  implements UseCase<CreateStaffSessionInput, CreateStaffSessionOutput>
{
  constructor(
    private readonly staffSessionRepository: IStaffSessionRepository,
    private readonly deviceLabelParser: IDeviceLabelParser,
  ) {}

  async execute(input: CreateStaffSessionInput): Promise<CreateStaffSessionOutput> {
    const now = new Date();
    const maxSessions = input.maxSessions ?? DEFAULT_MAX_STAFF_SESSIONS;
    const activeCount = await this.staffSessionRepository.countActiveForStaff(
      input.tenantId,
      input.staffId,
    );

    if (activeCount >= maxSessions) {
      await this.staffSessionRepository.revokeOldestActiveSessions(
        input.tenantId,
        input.staffId,
        activeCount - maxSessions + 1,
        input.staffId,
        'max_sessions_exceeded',
      );
    }

    const refreshTokenHash = hashRefreshTokenJti(input.refreshTokenJti);
    const deviceLabel = this.deviceLabelParser.parse(input.userAgent) ?? undefined;
    const session = StaffSession.create({
      tenantId: input.tenantId,
      staffId: input.staffId,
      userId: input.userId,
      refreshTokenHash,
      rememberMe: input.rememberMe,
      expiresAt: calculateStaffSessionExpiresAt(
        input.rememberMe,
        now,
        input.refreshTtlSeconds,
        input.refreshSessionTtlSeconds,
      ),
      deviceId: input.deviceId,
      deviceFingerprint: input.deviceFingerprint,
      deviceLabel,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      createdById: input.createdById,
    });

    try {
      await this.staffSessionRepository.create(session, input.createdById ?? input.staffId);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ApplicationError(
          'STAFF_SESSION_REFRESH_HASH_CONFLICT',
          'Refresh token hash collision. Retry login.',
          409,
        );
      }
      throw error;
    }

    return { sessionId: session.id };
  }
}
