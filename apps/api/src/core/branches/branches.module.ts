import {
  AUDIT_SERVICE,
  CreateBranchUseCase,
  GetBranchUseCase,
  ListBranchesUseCase,
  SoftDeleteBranchUseCase,
  UpdateBranchUseCase,
  type AuditService,
} from '@hivork/application';
import {
  PrismaBranchReader,
  PrismaModule,
  PrismaTenantPlanReader,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module';
import { BranchesController } from './branches.controller';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [BranchesController],
  providers: [
    PrismaBranchReader,
    PrismaTenantPlanReader,
    {
      provide: CreateBranchUseCase,
      useFactory: (
        branches: PrismaBranchReader,
        tenantPlans: PrismaTenantPlanReader,
        audit: AuditService,
      ) => new CreateBranchUseCase(branches, tenantPlans, audit),
      inject: [PrismaBranchReader, PrismaTenantPlanReader, AUDIT_SERVICE],
    },
    {
      provide: ListBranchesUseCase,
      useFactory: (branches: PrismaBranchReader) => new ListBranchesUseCase(branches),
      inject: [PrismaBranchReader],
    },
    {
      provide: GetBranchUseCase,
      useFactory: (branches: PrismaBranchReader) => new GetBranchUseCase(branches),
      inject: [PrismaBranchReader],
    },
    {
      provide: UpdateBranchUseCase,
      useFactory: (branches: PrismaBranchReader, audit: AuditService) =>
        new UpdateBranchUseCase(branches, audit),
      inject: [PrismaBranchReader, AUDIT_SERVICE],
    },
    {
      provide: SoftDeleteBranchUseCase,
      useFactory: (branches: PrismaBranchReader, audit: AuditService) =>
        new SoftDeleteBranchUseCase(branches, audit),
      inject: [PrismaBranchReader, AUDIT_SERVICE],
    },
  ],
})
export class BranchesModule {}
