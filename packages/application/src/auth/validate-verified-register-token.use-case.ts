import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IAuthTokenService, ITokenBlacklistPort } from './ports/token.port.js';

export type ValidateVerifiedRegisterTokenInput = {
  verifiedToken: string;
  ownerPhone?: string;
  /** When false, token remains valid for subsequent register/set-password steps. Default true. */
  consume?: boolean;
};

export type ValidateVerifiedRegisterTokenOutput = {
  phone: string;
};

export class ValidateVerifiedRegisterTokenUseCase
  implements UseCase<ValidateVerifiedRegisterTokenInput, ValidateVerifiedRegisterTokenOutput>
{
  constructor(
    private readonly tokens: IAuthTokenService,
    private readonly tokenBlacklist: ITokenBlacklistPort,
  ) {}

  async execute(
    input: ValidateVerifiedRegisterTokenInput,
  ): Promise<ValidateVerifiedRegisterTokenOutput> {
    if (await this.tokenBlacklist.isRevoked(input.verifiedToken)) {
      throw new ApplicationError(
        'VERIFIED_TOKEN_INVALID',
        'Verified token already used. Please verify OTP again.',
        401,
      );
    }

    const payload = await this.tokens.verifyVerifiedToken(input.verifiedToken);
    if (!payload) {
      throw new ApplicationError(
        'VERIFIED_TOKEN_EXPIRED',
        'Verified token expired. Please verify OTP again.',
        401,
      );
    }

    if (payload.actor !== 'staff' || payload.purpose !== 'register') {
      throw new ApplicationError('VERIFIED_TOKEN_INVALID', 'Invalid verified token.', 401);
    }

    if (input.ownerPhone !== undefined && payload.phone !== input.ownerPhone) {
      throw new ApplicationError(
        'VERIFIED_TOKEN_INVALID',
        'Verified token does not match owner phone.',
        401,
      );
    }

    if (input.consume !== false) {
      // One-time use: revoke immediately so the same token cannot be replayed.
      const ttl = 300; // matches verifiedToken TTL (5 min)
      await this.tokenBlacklist.revoke(input.verifiedToken, ttl);
    }

    return { phone: payload.phone };
  }
}
