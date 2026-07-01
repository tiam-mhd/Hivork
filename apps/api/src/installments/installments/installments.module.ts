import { ListInstallmentsUseCase } from '@hivork/application';
import { PrismaInstallmentRepository, PrismaModule } from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module.js';
import { InstallmentsController } from './installments.controller.js';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [InstallmentsController],
  providers: [
    PrismaInstallmentRepository,
    {
      provide: ListInstallmentsUseCase,
      useFactory: (installments: PrismaInstallmentRepository) =>
        new ListInstallmentsUseCase(installments),
      inject: [PrismaInstallmentRepository],
    },
  ],
})
export class InstallmentsModule {}
