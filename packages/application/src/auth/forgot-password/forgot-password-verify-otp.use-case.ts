import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IAuthTokenService } from '../ports/token.port.js';
import type { IOtpStore } from '../../ports/otp.port.js';
import type { IUserCredentialRepository } from '../../ports/user-credential.repository.port.js';
import type { IUserRepository } from '../../ports/user.repository.port.js';

const OTP_MAX_ATTEMPTS = 5;

export type ForgotPasswordVerifyOtpInput = {
  phone: string;
  code: string;
  clientIp?: string;
};

export type ForgotPasswordVerifyOtpOutput = {
  resetToken: string;
  expiresIn: number;
};

export class ForgotPasswordVerifyOtpUseCase
  implements UseCase<ForgotPasswordVerifyOtpInput, ForgotPasswordVerifyOtpOutput>
{
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly otpStore: IOtpStore,
    private readonly tokens: IAuthTokenService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ForgotPasswordVerifyOtpInput): Promise<ForgotPasswordVerifyOtpOutput> {
    const user = await this.userRepository.findByPhone(input.phone);
    const credential =
      user !== null ? await this.credentialRepository.findByUserId(user.id) : null;

    if (!user || !credential) {
      throw new ApplicationError('AUTH_OTP_INVALID', 'Invalid OTP code.', 400);
    }

    await this.assertOtpValid(input.phone, input.code);

    const { token } = await this.tokens.signResetToken({
      sub: user.id,
      actor: 'staff',
      purpose: 'password_reset',
    });

    await this.otpStore.delete({
      actor: 'staff',
      phone: input.phone,
      purpose: 'password_reset',
    });

    await this.audit.log({
      actorType: 'system',
      actorId: user.id,
      action: 'security.password.reset_otp_verified',
      entityType: 'user',
      entityId: user.id,
      ip: input.clientIp,
    });

    return {
      resetToken: token,
      expiresIn: this.tokens.getResetTtlSeconds(),
    };
  }

  private async assertOtpValid(phone: string, code: string): Promise<void> {
    const record = await this.otpStore.get({
      actor: 'staff',
      phone,
      purpose: 'password_reset',
    });

    if (!record) {
      throw new ApplicationError('AUTH_OTP_EXPIRED', 'OTP expired or not found.', 400);
    }

    if (record.code !== code) {
      const attempts = record.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await this.otpStore.delete({
          actor: 'staff',
          phone,
          purpose: 'password_reset',
        });
        throw new ApplicationError(
          'AUTH_OTP_TOO_MANY_ATTEMPTS',
          'Too many invalid OTP attempts.',
          429,
        );
      }

      await this.otpStore.update({
        actor: 'staff',
        phone,
        purpose: 'password_reset',
        record: { ...record, attempts },
      });
      throw new ApplicationError('AUTH_OTP_INVALID', 'Invalid OTP code.', 400);
    }
  }
}
