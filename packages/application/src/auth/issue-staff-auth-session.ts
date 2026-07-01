import { ApplicationError } from '../errors/application.error.js';
import type { IAuthTokenService } from './ports/token.port.js';
import type { CreateStaffSessionUseCase } from './create-staff-session.use-case.js';

export type IssueStaffAuthSessionInput = {
  staffId: string;
  tenantId: string;
  userId: string;
  rememberMe?: boolean;
  deviceId?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
};

export type IssueStaffAuthSessionOutput = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const REFRESH_HASH_RETRY_MAX = 3;

export async function issueStaffAuthSession(
  tokens: IAuthTokenService,
  createStaffSession: CreateStaffSessionUseCase,
  input: IssueStaffAuthSessionInput,
): Promise<IssueStaffAuthSessionOutput> {
  const rememberMe = input.rememberMe ?? false;

  const accessToken = await tokens.signAccessToken({
    sub: input.staffId,
    actor: 'staff',
    tenantId: input.tenantId,
  });

  for (let attempt = 0; attempt < REFRESH_HASH_RETRY_MAX; attempt += 1) {
    const { token: refreshToken, jti } = await tokens.signRefreshToken(
      { sub: input.staffId, actor: 'staff' },
      { rememberMe },
    );

    try {
      await createStaffSession.execute({
        tenantId: input.tenantId,
        staffId: input.staffId,
        userId: input.userId,
        refreshTokenJti: jti,
        rememberMe,
        deviceId: input.deviceId,
        deviceFingerprint: input.deviceFingerprint,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        refreshTtlSeconds: tokens.getRefreshTtlSeconds(),
        refreshSessionTtlSeconds: tokens.getRefreshSessionTtlSeconds(),
        createdById: input.staffId,
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: tokens.getAccessTtlSeconds(),
      };
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        error.code === 'STAFF_SESSION_REFRESH_HASH_CONFLICT' &&
        attempt < REFRESH_HASH_RETRY_MAX - 1
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new ApplicationError(
    'INTERNAL_ERROR',
    'Unable to create staff session after retries.',
    500,
  );
}
