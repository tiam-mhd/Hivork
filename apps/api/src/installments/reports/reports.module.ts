import {
  GetCashflowForecastUseCase,
  GetDashboardReportUseCase,
  ListInstallmentsUseCase,
  ListOverdueReportUseCase,
  ListTodayDueInstallmentsUseCase,
} from '@hivork/application';
import {
  PrismaInstallmentReportRepository,
  PrismaInstallmentRepository,
  PrismaModule,
  PrismaOverdueReportRepository,
  PrismaTenantRepository,
  RedisReportCache,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module.js';
import { ReportsController } from './reports.controller.js';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [ReportsController],
  providers: [
    PrismaInstallmentReportRepository,
    PrismaOverdueReportRepository,
    PrismaInstallmentRepository,
    PrismaTenantRepository,
    RedisReportCache,
    {
      provide: ListInstallmentsUseCase,
      useFactory: (installments: PrismaInstallmentRepository) =>
        new ListInstallmentsUseCase(installments),
      inject: [PrismaInstallmentRepository],
    },
    {
      provide: ListTodayDueInstallmentsUseCase,
      useFactory: (listInstallments: ListInstallmentsUseCase) =>
        new ListTodayDueInstallmentsUseCase(listInstallments),
      inject: [ListInstallmentsUseCase],
    },
    {
      provide: ListOverdueReportUseCase,
      useFactory: (overdueReport: PrismaOverdueReportRepository) =>
        new ListOverdueReportUseCase(overdueReport),
      inject: [PrismaOverdueReportRepository],
    },
    {
      provide: GetDashboardReportUseCase,
      useFactory: (
        reports: PrismaInstallmentReportRepository,
        tenants: PrismaTenantRepository,
        reportCache: RedisReportCache,
      ) => new GetDashboardReportUseCase(reports, tenants, reportCache),
      inject: [PrismaInstallmentReportRepository, PrismaTenantRepository, RedisReportCache],
    },
    {
      provide: GetCashflowForecastUseCase,
      useFactory: (
        reports: PrismaInstallmentReportRepository,
        tenants: PrismaTenantRepository,
      ) => new GetCashflowForecastUseCase(reports, tenants),
      inject: [PrismaInstallmentReportRepository, PrismaTenantRepository],
    },
  ],
  exports: [RedisReportCache],
})
export class ReportsModule {}
