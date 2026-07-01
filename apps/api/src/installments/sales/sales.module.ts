import {
  AUDIT_SERVICE,
  CancelSaleUseCase,
  CreateSaleUseCase,
  GetSaleUseCase,
  ListSalesUseCase,
  OUTBOX_PUBLISHER,
  SALE_IDEMPOTENCY_STORE,
  type AuditService,
  type IOutboxPublisher,
  type ISaleIdempotencyStore,
} from '@hivork/application';
import {
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaModule,
  PrismaOutboxPublisher,
  PrismaSaleIdempotencyStore,
  PrismaSaleRepository,
  PrismaTenantCustomerRepository,
  PrismaTenantPlanReader,
  PrismaUnitOfWork,
  RedisReportCache,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { SalesController } from './sales.controller.js';

@Module({
  imports: [PrismaModule, AuthCommonModule, ReportsModule],
  controllers: [SalesController],
  providers: [
    PrismaUnitOfWork,
    PrismaSaleRepository,
    PrismaInstallmentRepository,
    PrismaTenantCustomerRepository,
    PrismaBranchReader,
    PrismaTenantPlanReader,
    PrismaSaleIdempotencyStore,
    PrismaOutboxPublisher,
    {
      provide: SALE_IDEMPOTENCY_STORE,
      useExisting: PrismaSaleIdempotencyStore,
    },
    {
      provide: OUTBOX_PUBLISHER,
      useExisting: PrismaOutboxPublisher,
    },
    {
      provide: CreateSaleUseCase,
      useFactory: (
        unitOfWork: PrismaUnitOfWork,
        sales: PrismaSaleRepository,
        installments: PrismaInstallmentRepository,
        tenantCustomers: PrismaTenantCustomerRepository,
        branches: PrismaBranchReader,
        tenantPlans: PrismaTenantPlanReader,
        idempotency: ISaleIdempotencyStore,
        audit: AuditService,
        outbox: IOutboxPublisher,
        reportCache: RedisReportCache,
      ) =>
        new CreateSaleUseCase(
          unitOfWork,
          sales,
          installments,
          tenantCustomers,
          branches,
          tenantPlans,
          idempotency,
          audit,
          outbox,
          reportCache,
        ),
      inject: [
        PrismaUnitOfWork,
        PrismaSaleRepository,
        PrismaInstallmentRepository,
        PrismaTenantCustomerRepository,
        PrismaBranchReader,
        PrismaTenantPlanReader,
        SALE_IDEMPOTENCY_STORE,
        AUDIT_SERVICE,
        OUTBOX_PUBLISHER,
        RedisReportCache,
      ],
    },
    {
      provide: ListSalesUseCase,
      useFactory: (sales: PrismaSaleRepository) => new ListSalesUseCase(sales),
      inject: [PrismaSaleRepository],
    },
    {
      provide: GetSaleUseCase,
      useFactory: (sales: PrismaSaleRepository, installments: PrismaInstallmentRepository) =>
        new GetSaleUseCase(sales, installments),
      inject: [PrismaSaleRepository, PrismaInstallmentRepository],
    },
    {
      provide: CancelSaleUseCase,
      useFactory: (
        unitOfWork: PrismaUnitOfWork,
        sales: PrismaSaleRepository,
        installments: PrismaInstallmentRepository,
        audit: AuditService,
        reportCache: RedisReportCache,
      ) => new CancelSaleUseCase(unitOfWork, sales, installments, audit, reportCache),
      inject: [
        PrismaUnitOfWork,
        PrismaSaleRepository,
        PrismaInstallmentRepository,
        AUDIT_SERVICE,
        RedisReportCache,
      ],
    },
  ],
})
export class SalesModule {}
