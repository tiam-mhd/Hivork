import { GetStaffLastLoginUseCase, ListStaffSecurityAuditUseCase } from '@hivork/application';
import {
  PrismaModule,
  PrismaStaffRepository,
  PrismaStaffSecurityAuditRepository,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module';
import { StaffSecurityController } from './staff-security.controller';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [StaffSecurityController],
  providers: [
    PrismaStaffRepository,
    PrismaStaffSecurityAuditRepository,
    {
      provide: GetStaffLastLoginUseCase,
      useFactory: (staff: PrismaStaffRepository) => new GetStaffLastLoginUseCase(staff),
      inject: [PrismaStaffRepository],
    },
    {
      provide: ListStaffSecurityAuditUseCase,
      useFactory: (audit: PrismaStaffSecurityAuditRepository) =>
        new ListStaffSecurityAuditUseCase(audit),
      inject: [PrismaStaffSecurityAuditRepository],
    },
  ],
})
export class StaffSecurityModule {}
