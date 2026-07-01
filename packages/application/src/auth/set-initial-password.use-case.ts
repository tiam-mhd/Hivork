import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { ValidateVerifiedRegisterTokenUseCase } from './validate-verified-register-token.use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IPasswordHasherPort } from '../ports/password-hasher.port.js';
import type { IUserCredentialRepository } from '../ports/user-credential.repository.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';

export type SetInitialPasswordInput = {
  verifiedToken: string;
  password: string;
  clientIp?: string;
  userAgent?: string;
};

export type SetInitialPasswordOutput = {
  success: true;
};

export class SetInitialPasswordUseCase
  implements UseCase<SetInitialPasswordInput, SetInitialPasswordOutput>
{
  constructor(
    private readonly validateVerifiedToken: ValidateVerifiedRegisterTokenUseCase,
    private readonly userRepository: IUserRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly passwordHasher: IPasswordHasherPort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SetInitialPasswordInput): Promise<SetInitialPasswordOutput> {
    const { phone } = await this.validateVerifiedToken.execute({
      verifiedToken: input.verifiedToken,
      consume: false,
    });

    const user = await this.userRepository.findOrCreateByPhone(phone);

    const existing = await this.credentialRepository.findByUserId(user.id);
    if (existing) {
      throw new ApplicationError(
        'AUTH_CREDENTIAL_ALREADY_EXISTS',
        'Password is already set for this account. Use login or reset password.',
        409,
      );
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const credential = await this.credentialRepository.create({
      userId: user.id,
      passwordHash,
      createdById: user.id,
    });

    await this.audit.log({
      actorType: 'system',
      actorId: user.id,
      action: 'security.password.set_initial',
      entityType: 'user_credential',
      entityId: credential.id,
      newValue: { userId: user.id },
      ip: input.clientIp,
      userAgent: input.userAgent,
    });

    return { success: true };
  }
}
