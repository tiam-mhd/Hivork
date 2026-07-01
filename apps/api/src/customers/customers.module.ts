import {
  AUDIT_SERVICE,
  CreateTenantCustomerUseCase,
  CUSTOMER_IMPORT_IDEMPOTENCY_STORE,
  ExportService,
  ExportTenantCustomersUseCase,
  GetTenantCustomerUseCase,
  ImportCustomersExcelUseCase,
  ListDeletedTenantCustomersUseCase,
  ListTenantCustomersUseCase,
  PdfExportService,
  RestoreEntityUseCase,
  SoftDeleteEntityUseCase,
  UpdateTenantCustomerUseCase,
  type AuditService,
  type ICustomerImportIdempotencyStore,
} from '@hivork/application';
import {
  PrismaBranchReader,
  PrismaGlobalCustomerRepository,
  PrismaModule,
  PrismaSaleRepository,
  PrismaTenantCustomerRepository,
  PrismaTenantPlanReader,
  PrismaTenantRepository,
  PrismaUserRepository,
  RedisCustomerImportIdempotencyStore,
  RedisExportRateLimiterService,
  RedisModule,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../common/auth-common.module';
import { PrintSnapshotsModule } from '../core/print/print-snapshots.module';
import { CustomersController } from './customers.controller';

@Module({
  imports: [PrismaModule, AuthCommonModule, RedisModule, PrintSnapshotsModule],
  controllers: [CustomersController],
  providers: [
    PrismaTenantCustomerRepository,
    PrismaTenantRepository,
    PrismaGlobalCustomerRepository,
    PrismaUserRepository,
    PrismaBranchReader,
    PrismaTenantPlanReader,
    PrismaSaleRepository,
    RedisCustomerImportIdempotencyStore,
    RedisExportRateLimiterService,
    ExportService,
    {
      provide: CUSTOMER_IMPORT_IDEMPOTENCY_STORE,
      useExisting: RedisCustomerImportIdempotencyStore,
    },
    {
      provide: SoftDeleteEntityUseCase,
      useFactory: (repository: PrismaTenantCustomerRepository, audit: AuditService) =>
        new SoftDeleteEntityUseCase(repository, audit, 'tenant_customer'),
      inject: [PrismaTenantCustomerRepository, AUDIT_SERVICE],
    },
    {
      provide: RestoreEntityUseCase,
      useFactory: (repository: PrismaTenantCustomerRepository, audit: AuditService) =>
        new RestoreEntityUseCase(repository, audit, 'tenant_customer'),
      inject: [PrismaTenantCustomerRepository, AUDIT_SERVICE],
    },
    {
      provide: ListDeletedTenantCustomersUseCase,
      useFactory: (repository: PrismaTenantCustomerRepository) =>
        new ListDeletedTenantCustomersUseCase(repository),
      inject: [PrismaTenantCustomerRepository],
    },
    {
      provide: ListTenantCustomersUseCase,
      useFactory: (repository: PrismaTenantCustomerRepository) =>
        new ListTenantCustomersUseCase(repository),
      inject: [PrismaTenantCustomerRepository],
    },
    {
      provide: GetTenantCustomerUseCase,
      useFactory: (
        tenantCustomers: PrismaTenantCustomerRepository,
        sales: PrismaSaleRepository,
      ) => new GetTenantCustomerUseCase(tenantCustomers, sales),
      inject: [PrismaTenantCustomerRepository, PrismaSaleRepository],
    },
    {
      provide: UpdateTenantCustomerUseCase,
      useFactory: (
        tenantCustomers: PrismaTenantCustomerRepository,
        globalCustomers: PrismaGlobalCustomerRepository,
        branches: PrismaBranchReader,
        sales: PrismaSaleRepository,
        audit: AuditService,
      ) =>
        new UpdateTenantCustomerUseCase(
          tenantCustomers,
          globalCustomers,
          branches,
          sales,
          audit,
        ),
      inject: [
        PrismaTenantCustomerRepository,
        PrismaGlobalCustomerRepository,
        PrismaBranchReader,
        PrismaSaleRepository,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: CreateTenantCustomerUseCase,
      useFactory: (
        users: PrismaUserRepository,
        globalCustomers: PrismaGlobalCustomerRepository,
        tenantCustomers: PrismaTenantCustomerRepository,
        branches: PrismaBranchReader,
        tenantPlans: PrismaTenantPlanReader,
        audit: AuditService,
      ) =>
        new CreateTenantCustomerUseCase(
          users,
          globalCustomers,
          tenantCustomers,
          branches,
          tenantPlans,
          audit,
        ),
      inject: [
        PrismaUserRepository,
        PrismaGlobalCustomerRepository,
        PrismaTenantCustomerRepository,
        PrismaBranchReader,
        PrismaTenantPlanReader,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: ImportCustomersExcelUseCase,
      useFactory: (
        createTenantCustomer: CreateTenantCustomerUseCase,
        idempotency: ICustomerImportIdempotencyStore,
        audit: AuditService,
      ) => new ImportCustomersExcelUseCase(createTenantCustomer, idempotency, audit),
      inject: [CreateTenantCustomerUseCase, CUSTOMER_IMPORT_IDEMPOTENCY_STORE, AUDIT_SERVICE],
    },
    {
      provide: ExportTenantCustomersUseCase,
      useFactory: (
        repository: PrismaTenantCustomerRepository,
        tenants: PrismaTenantRepository,
        exportService: ExportService,
        pdfExportService: PdfExportService,
        audit: AuditService,
        rateLimiter: RedisExportRateLimiterService,
      ) =>
        new ExportTenantCustomersUseCase(
          repository,
          tenants,
          exportService,
          pdfExportService,
          audit,
          rateLimiter,
        ),
      inject: [
        PrismaTenantCustomerRepository,
        PrismaTenantRepository,
        ExportService,
        PdfExportService,
        AUDIT_SERVICE,
        RedisExportRateLimiterService,
      ],
    },
  ],
})
export class CustomersModule {}
