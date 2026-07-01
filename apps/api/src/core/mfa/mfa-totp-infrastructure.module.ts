import {
  Argon2PasswordHasher,
  MfaEncryptionService,
  OtplibTotpService,
  PrismaModule,
  PrismaService,
  PrismaUserMfaTotpRepository,
  PrismaUserMfaPort,
  TotpVerificationService,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';

@Module({
  imports: [PrismaModule, AppConfigModule],
  providers: [
    OtplibTotpService,
    PrismaUserMfaTotpRepository,
    Argon2PasswordHasher,
    {
      provide: MfaEncryptionService,
      useFactory: (config: AppConfigService) =>
        new MfaEncryptionService(config.mfaEncryptionKey),
      inject: [AppConfigService],
    },
    {
      provide: TotpVerificationService,
      useFactory: (
        totpRepo: PrismaUserMfaTotpRepository,
        totpService: OtplibTotpService,
        encryption: MfaEncryptionService,
        passwordHasher: Argon2PasswordHasher,
      ) => new TotpVerificationService(totpRepo, totpService, encryption, passwordHasher),
      inject: [
        PrismaUserMfaTotpRepository,
        OtplibTotpService,
        MfaEncryptionService,
        Argon2PasswordHasher,
      ],
    },
    {
      provide: PrismaUserMfaPort,
      useFactory: (
        prisma: PrismaService,
        totpRepo: PrismaUserMfaTotpRepository,
        totpVerification: TotpVerificationService,
      ) => new PrismaUserMfaPort(prisma, totpRepo, totpVerification),
      inject: [PrismaService, PrismaUserMfaTotpRepository, TotpVerificationService],
    },
  ],
  exports: [
    MfaEncryptionService,
    OtplibTotpService,
    PrismaUserMfaTotpRepository,
    TotpVerificationService,
    PrismaUserMfaPort,
    Argon2PasswordHasher,
  ],
})
export class MfaTotpInfrastructureModule {}
