import { randomUUID } from 'node:crypto';

import { Sale, SaleCreatedEvent } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { SaveInstallmentPersistenceInput, IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { IOutboxPublisher } from '../../ports/outbox.port.js';
import type { IReportCache } from '../../ports/report-cache.port.js';
import type { ISaleIdempotencyStore } from '../../ports/sale-idempotency.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../../ports/tenant-customer.repository.port.js';
import type { ITenantPlanReader } from '../../ports/tenant-plan.reader.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import {
  mapSaleToDetail,
  saleDetailFromRecord,
  saleDetailToRecord,
  type SaleDetail,
} from './sale-detail.mapper.js';
import { hashCreateSaleRequest } from './create-sale-request-hash.js';

export type CreateSaleInput = {
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  tenantCustomerId: string;
  branchId: string;
  title?: string;
  description?: string;
  invoiceNumber?: string;
  totalAmountRial: bigint;
  downPaymentRial: bigint;
  discountRial?: bigint;
  taxRial?: bigint;
  installmentCount: number;
  firstDueDate: Date;
  contractDate: Date;
  intervalDays: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export class CreateSaleUseCase implements UseCase<CreateSaleInput, SaleDetail> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly branches: IBranchReader,
    private readonly tenantPlans: ITenantPlanReader,
    private readonly idempotency: ISaleIdempotencyStore,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: CreateSaleInput): Promise<SaleDetail> {
    const requestHash = hashCreateSaleRequest(input);
    const cached = await this.idempotency.find(input.tenantId, input.idempotencyKey);

    if (cached) {
      if (cached.requestHash !== requestHash) {
        throw new ApplicationError(
          'IDEMPOTENCY_CONFLICT',
          'Idempotency key was already used with a different request body.',
          409,
        );
      }

      return saleDetailFromRecord(cached.response);
    }

    let saleBundle: ReturnType<typeof Sale.create>;
    try {
      saleBundle = Sale.create({
        tenantId: input.tenantId,
        branchId: input.branchId,
        tenantCustomerId: input.tenantCustomerId,
        createdByStaffId: input.actorId,
        title: input.title,
        description: input.description,
        invoiceNumber: input.invoiceNumber,
        totalAmountRial: input.totalAmountRial,
        downPaymentRial: input.downPaymentRial,
        discountRial: input.discountRial ?? null,
        taxRial: input.taxRial ?? null,
        installmentCount: input.installmentCount,
        firstDueDate: input.firstDueDate,
        intervalDays: input.intervalDays,
        contractDate: input.contractDate,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const { sale, installments: drafts } = saleBundle;

    try {
      const detail = await this.unitOfWork.transaction(async (tx) => {
        await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);
        await this.assertCustomerExists(input.tenantId, input.tenantCustomerId);
        await this.assertPlanLimit(input.tenantId, tx);

        const saleRecord = await this.sales.save(
          {
            id: sale.id,
            tenantId: sale.tenantId,
            branchId: sale.branchId,
            tenantCustomerId: sale.tenantCustomerId,
            createdByStaffId: sale.createdByStaffId,
            createdById: input.actorId,
            title: sale.title,
            description: sale.description,
            invoiceNumber: sale.invoiceNumber,
            totalAmountRial: sale.totalAmountRial,
            downPaymentRial: sale.downPaymentRial,
            discountRial: sale.discountRial,
            taxRial: sale.taxRial,
            installmentCount: sale.installmentCount,
            firstDueDate: sale.firstDueDate,
            intervalDays: sale.intervalDays,
            contractDate: sale.contractDate,
            status: 'ACTIVE',
            version: sale.version,
          },
          tx,
        );

        const installmentRecords = await this.installments.saveMany(
          drafts.map((draft) => ({
            id: randomUUID(),
            saleId: draft.saleId,
            tenantId: draft.tenantId,
            sequenceNumber: draft.sequenceNumber,
            dueDate: draft.dueDate,
            amountRial: draft.amountRial,
            status: draft.status as SaveInstallmentPersistenceInput['status'],
            createdById: input.actorId,
          })),
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.actorId,
            action: 'sale.create',
            entityType: 'sale',
            entityId: sale.id,
            newValue: {
              saleId: sale.id,
              tenantCustomerId: input.tenantCustomerId,
              branchId: input.branchId,
              totalAmountRial: sale.totalAmountRial.toString(),
              installmentCount: input.installmentCount,
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        await this.outbox.publish(
          new SaleCreatedEvent(sale.id, {
            saleId: sale.id,
            tenantCustomerId: input.tenantCustomerId,
            branchId: input.branchId,
            totalAmountRial: sale.totalAmountRial.toString(),
            installmentCount: input.installmentCount,
          }),
          { tenantId: input.tenantId, aggregateType: 'sale' },
          tx,
        );

        const detail = mapSaleToDetail(saleRecord, installmentRecords);

        await this.idempotency.store(
          input.tenantId,
          input.idempotencyKey,
          requestHash,
          saleDetailToRecord(detail),
          tx,
        );

        return detail;
      });

      await this.invalidateDashboardCache(input.tenantId);
      return detail;
    } catch (error) {
      throw mapDomainError(error);
    }
  }

  private async invalidateDashboardCache(tenantId: string): Promise<void> {
    if (!this.reportCache) {
      return;
    }

    try {
      await this.reportCache.invalidateTenantDashboard(tenantId);
    } catch {
      // cache invalidation is best-effort
    }
  }

  private async assertBranchAccess(
    tenantId: string,
    branchId: string,
    staffContext: DataScopeStaffContext,
  ): Promise<void> {
    const exists = await this.branches.existsActiveInTenant(tenantId, branchId);
    if (!exists) {
      throw new ApplicationError('BRANCH_NOT_ALLOWED', 'Branch is not available for this tenant.', 403);
    }

    if (staffContext.dataScope === 'all') {
      return;
    }

    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0 && !effective.includes(branchId)) {
      throw new ApplicationError(
        'BRANCH_NOT_ALLOWED',
        'Branch is not assigned to this staff.',
        403,
      );
    }
  }

  private async assertCustomerExists(tenantId: string, tenantCustomerId: string): Promise<void> {
    const customer = await this.tenantCustomers.findActiveById(tenantCustomerId, tenantId);
    if (!customer) {
      throw new ApplicationError('CUSTOMER_NOT_FOUND', 'Customer was not found for this tenant.', 404);
    }
  }

  private async assertPlanLimit(tenantId: string, tx: unknown): Promise<void> {
    const maxActiveSales = await this.tenantPlans.getMaxActiveSales(tenantId);
    const activeCount = await this.sales.countActive(tenantId, tx);
    if (activeCount >= maxActiveSales) {
      throw new ApplicationError(
        'TENANT_PLAN_LIMIT_EXCEEDED',
        'Active sale limit has been reached for the current plan.',
        403,
      );
    }
  }
}
