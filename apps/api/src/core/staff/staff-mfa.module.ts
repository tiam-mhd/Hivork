import {
  AUDIT_SERVICE,
  DisableTotpUseCase,
  GetStaffMfaStatusUseCase,
  RegenerateTotpBackupCodesUseCase,
  SetupTotpUseCase,
  VerifyTotpSetupUseCase,
  type AuditService,
} from '@hivork/application';
import {
  MfaEncryptionService,
  OtplibTotpService,
  PrismaModule,
  PrismaStaffRepository,
  PrismaUserCredentialRepository,
  PrismaUserMfaPort,
  PrismaUserMfaTotpRepository,
  PrismaUserRepository,
  QrCodeGeneratorService,
  RedisModule,
  RedisTotpSetupStore,
  Argon2PasswordHasher,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module';
import { MfaTotpInfrastructureModule } from '../mfa/mfa-totp-infrastructure.module';
import { StaffMfaController } from '../staff/staff-mfa.controller';
import { StaffMfaStatusController } from './staff-mfa-status.controller';

@Module({
  imports: [PrismaModule, RedisModule, AuthCommonModule, MfaTotpInfrastructureModule],
  controllers: [StaffMfaController, StaffMfaStatusController],
  providers: [
    QrCodeGeneratorService,
    PrismaUserMfaTotpRepository,
    RedisTotpSetupStore,
    {
      provide: SetupTotpUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        users: PrismaUserRepository,
        totpRepo: PrismaUserMfaTotpRepository,
        totpService: OtplibTotpService,
        encryption: MfaEncryptionService,
        setupStore: RedisTotpSetupStore,
        qrCode: QrCodeGeneratorService,
        audit: AuditService,
      ) =>
        new SetupTotpUseCase(
          staff,
          users,
          totpRepo,
          totpService,
          encryption,
          setupStore,
          qrCode,
          audit,
        ),
      inject: [
        PrismaStaffRepository,
        PrismaUserRepository,
        PrismaUserMfaTotpRepository,
        OtplibTotpService,
        MfaEncryptionService,
        RedisTotpSetupStore,
        QrCodeGeneratorService,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: VerifyTotpSetupUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        totpRepo: PrismaUserMfaTotpRepository,
        totpService: OtplibTotpService,
        encryption: MfaEncryptionService,
        setupStore: RedisTotpSetupStore,
        passwordHasher: Argon2PasswordHasher,
        audit: AuditService,
      ) =>
        new VerifyTotpSetupUseCase(
          staff,
          totpRepo,
          totpService,
          encryption,
          setupStore,
          passwordHasher,
          audit,
        ),
      inject: [
        PrismaStaffRepository,
        PrismaUserMfaTotpRepository,
        OtplibTotpService,
        MfaEncryptionService,
        RedisTotpSetupStore,
        Argon2PasswordHasher,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: DisableTotpUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        credentials: PrismaUserCredentialRepository,
        passwordHasher: Argon2PasswordHasher,
        totpRepo: PrismaUserMfaTotpRepository,
        setupStore: RedisTotpSetupStore,
        audit: AuditService,
      ) =>
        new DisableTotpUseCase(
          staff,
          credentials,
          passwordHasher,
          totpRepo,
          setupStore,
          audit,
        ),
      inject: [
        PrismaStaffRepository,
        PrismaUserCredentialRepository,
        Argon2PasswordHasher,
        PrismaUserMfaTotpRepository,
        RedisTotpSetupStore,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: RegenerateTotpBackupCodesUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        credentials: PrismaUserCredentialRepository,
        passwordHasher: Argon2PasswordHasher,
        totpRepo: PrismaUserMfaTotpRepository,
        audit: AuditService,
      ) =>
        new RegenerateTotpBackupCodesUseCase(
          staff,
          credentials,
          passwordHasher,
          totpRepo,
          audit,
        ),
      inject: [
        PrismaStaffRepository,
        PrismaUserCredentialRepository,
        Argon2PasswordHasher,
        PrismaUserMfaTotpRepository,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: GetStaffMfaStatusUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        userMfa: PrismaUserMfaPort,
        totpRepo: PrismaUserMfaTotpRepository,
      ) => new GetStaffMfaStatusUseCase(staff, userMfa, totpRepo),
      inject: [PrismaStaffRepository, PrismaUserMfaPort, PrismaUserMfaTotpRepository],
    },
  ],
})
export class StaffMfaModule {}
