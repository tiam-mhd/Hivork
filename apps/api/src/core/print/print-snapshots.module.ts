import {
  AUDIT_SERVICE,
  CreatePrintSnapshotUseCase,
  GetPrintSnapshotUseCase,
  PDF_EXPORT_PORT,
  PRINT_SNAPSHOT_STORE,
  PdfExportService,
  type AuditService,
  type IPdfExportPort,
  type IPrintSnapshotStore,
} from '@hivork/application';
import {
  PrismaModule,
  PrismaTenantCustomerRepository,
  PrismaTenantRepository,
  PuppeteerPdfExportService,
  RedisExportRateLimiterService,
  RedisModule,
  RedisPrintSnapshotStore,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module.js';
import { PrintSnapshotsController } from './print-snapshots.controller.js';

@Module({
  imports: [PrismaModule, AuthCommonModule, RedisModule],
  controllers: [PrintSnapshotsController],
  providers: [
    PrismaTenantCustomerRepository,
    PrismaTenantRepository,
    RedisPrintSnapshotStore,
    RedisExportRateLimiterService,
    PuppeteerPdfExportService,
    {
      provide: PDF_EXPORT_PORT,
      useExisting: PuppeteerPdfExportService,
    },
    {
      provide: PRINT_SNAPSHOT_STORE,
      useExisting: RedisPrintSnapshotStore,
    },
    {
      provide: PdfExportService,
      useFactory: (pdfPort: IPdfExportPort) => new PdfExportService(pdfPort),
      inject: [PDF_EXPORT_PORT],
    },
    {
      provide: CreatePrintSnapshotUseCase,
      useFactory: (
        repository: PrismaTenantCustomerRepository,
        tenants: PrismaTenantRepository,
        snapshotStore: IPrintSnapshotStore,
        audit: AuditService,
        rateLimiter: RedisExportRateLimiterService,
      ) =>
        new CreatePrintSnapshotUseCase(
          repository,
          tenants,
          snapshotStore,
          audit,
          rateLimiter,
        ),
      inject: [
        PrismaTenantCustomerRepository,
        PrismaTenantRepository,
        PRINT_SNAPSHOT_STORE,
        AUDIT_SERVICE,
        RedisExportRateLimiterService,
      ],
    },
    {
      provide: GetPrintSnapshotUseCase,
      useFactory: (snapshotStore: IPrintSnapshotStore) =>
        new GetPrintSnapshotUseCase(snapshotStore),
      inject: [PRINT_SNAPSHOT_STORE],
    },
  ],
  exports: [PdfExportService, PDF_EXPORT_PORT],
})
export class PrintSnapshotsModule {}
