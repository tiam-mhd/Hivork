import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IAuthTokenService, ITokenBlacklistPort, MfaPendingTokenPayload } from './ports/token.port.js';

export type ValidateMfaPendingTokenInput = {
  mfaToken: string;
  consume?: boolean;
};

export class ValidateMfaPendingTokenUseCase
  implements UseCase<ValidateMfaPendingTokenInput, MfaPendingTokenPayload>
{
  constructor(
    private readonly tokens: IAuthTokenService,
    private readonly tokenBlacklist: ITokenBlacklistPort,
  ) {}

  async execute(input: ValidateMfaPendingTokenInput): Promise<MfaPendingTokenPayload> {
    if (await this.tokenBlacklist.isRevoked(input.mfaToken)) {
      throw new ApplicationError(
        'AUTH_MFA_TOKEN_INVALID',
        'MFA token already used. Please sign in again.',
        401,
      );
    }

    const payload = await this.tokens.verifyMfaPendingToken(input.mfaToken);
    if (!payload) {
      throw new ApplicationError(
        'AUTH_MFA_TOKEN_EXPIRED',
        'MFA session expired. Please sign in again.',
        401,
      );
    }

    if (payload.actor !== 'staff' || payload.type !== 'mfa_pending') {
      throw new ApplicationError('AUTH_MFA_TOKEN_INVALID', 'Invalid MFA token.', 401);
    }

    if (input.consume !== false) {
      await this.tokenBlacklist.revoke(
        input.mfaToken,
        this.tokens.getMfaPendingTtlSeconds(),
      );
    }

    return payload;
  }
}
