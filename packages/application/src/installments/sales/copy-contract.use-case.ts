import { randomUUID } from 'node:crypto';

import { Sale, SaleCreatedEvent } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IContractAttachmentRepository } from '../../ports/contract-attachment.repository.port.js';
import type { IContractNumberAllocator } from '../../ports/contract-number-allocator.port.js';
import type { IContractVersionRepository } from '../../ports/contract-version.repository.port.js';
import type { SaveInstallmentPersistenceInput, IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { IOutboxPublisher } from '../../ports/outbox.port.js';
import type { IReportCache } from '../../ports/report-cache.port.js';
import type { ISaleCopyRelatedRepository } from '../../ports/sale-copy-related.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../../ports/tenant-customer.repository.port.js';
import type { ITenantPlanReader } from '../../ports/tenant-plan.reader.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import {
  buildContractVersionSnapshot,
  parseDateOnlyUtc,
} from './contract-version-snapshot.helper.js';
import { isSaleInScope } from './sale-data-scope.js';
import { saleRecordToDomain } from './sale-record.mapper.js';
import {
  mapSaleToEnterpriseDetail,
  type SaleDetailEnterprise,
} from './sale-enterprise.mapper.js';

export type CopyContractInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  sourceSaleId: string;
  tenantCustomerId?: string;
  branchIdTarget?: string;
  contractDate: string;
  firstDueDate: string;
  copyAttachments?: boolean;
  copyGuarantors?: boolean;
  reason: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type CopyContractResult = {
  newSaleId: string;
  contractNumber: string;
  sale: SaleDetailEnterprise;
};

export class CopyContractUseCase implements UseCase<CopyContractInput, CopyContractResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly contractVersions: IContractVersionRepository,
    private readonly contractAttachments: IContractAttachmentRepository,
    private readonly copyRelated: ISaleCopyRelatedRepository,
    private readonly contractNumbers: IContractNumberAllocator,
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly branches: IBranchReader,
    private readonly tenantPlans: ITenantPlanReader,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: CopyContractInput): Promise<CopyContractResult> {
    if (input.reason.trim().length < 3) {
      throw new ApplicationError('FIELD_REQUIRED', 'Copy reason is required.', 400);
    }

    const contractDate = parseDateOnlyUtc(input.contractDate);
    const firstDueDate = parseDateOnlyUtc(input.firstDueDate);
    const copyAttachments = input.copyAttachments ?? false;
    const copyGuarantors = input.copyGuarantors ?? true;

    try {
      const result = await this.unitOfWork.transaction(async (tx) => {
        const sourceRecord = await this.sales.findById(input.tenantId, input.sourceSaleId, tx);
        if (!sourceRecord || sourceRecord.deletedAt) {
          throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
        }

        if (!isSaleInScope(sourceRecord, input.staffId, input.staffContext)) {
          throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
        }

        const sourceSale = saleRecordToDomain(sourceRecord);
        if (!sourceSale.canCopy()) {
          throw new ApplicationError(
            'SALE_ARCHIVED_READONLY',
            'Archived contracts cannot be copied.',
            409,
          );
        }

        const targetBranchId = input.branchIdTarget ?? sourceRecord.branchId;
        const targetCustomerId = input.tenantCustomerId ?? sourceRecord.tenantCustomerId;

        await this.assertBranchAccess(input.tenantId, targetBranchId, input.staffContext);
        await this.assertCustomerExists(input.tenantId, targetCustomerId);
        await this.assertPlanLimit(input.tenantId, tx);

        const sourceInstallments = await this.installments.findBySaleId(
          input.tenantId,
          sourceRecord.id,
          tx,
        );
        const sortedSourceInstallments = [...sourceInstallments].sort(
          (left, right) => left.sequenceNumber - right.sequenceNumber,
        );

        let saleBundle: ReturnType<typeof Sale.create>;
        try {
          saleBundle = Sale.create({
            tenantId: input.tenantId,
            branchId: targetBranchId,
            tenantCustomerId: targetCustomerId,
            createdByStaffId: input.staffId,
            title: sourceRecord.title ?? undefined,
            description: sourceRecord.description ?? undefined,
            invoiceNumber: undefined,
            totalAmountRial: sourceRecord.totalAmountRial,
            downPaymentRial: sourceRecord.downPaymentRial,
            discountRial: sourceRecord.discountRial,
            taxRial: sourceRecord.taxRial,
            installmentCount: sourceRecord.installmentCount,
            firstDueDate,
            intervalDays: sourceRecord.intervalDays,
            contractDate,
            metadata: {
              ...(sourceRecord.metadata ?? {}),
              copiedFromSaleId: sourceRecord.id,
              copyReason: input.reason.trim(),
            },
          });
        } catch (error) {
          throw mapDomainError(error);
        }

        const { sale, installments: drafts } = saleBundle;
        const contractNumber = await this.contractNumbers.allocate(input.tenantId, tx);

        const sourceLatestVersion = await this.contractVersions.findLatestVersionNumber(
          input.tenantId,
          sourceRecord.id,
        );

        await this.contractVersions.appendVersion(
          {
            tenantId: input.tenantId,
            saleId: sourceRecord.id,
            versionNumber: (sourceLatestVersion ?? 0) + 1,
            changeType: 'COPY_SOURCE',
            changeReason: input.reason.trim(),
            snapshot: buildContractVersionSnapshot(sourceRecord, sortedSourceInstallments),
            createdById: input.staffId,
          },
          tx,
        );

        const newSaleRecord = await this.sales.save(
          {
            id: sale.id,
            tenantId: sale.tenantId,
            branchId: sale.branchId,
            tenantCustomerId: sale.tenantCustomerId,
            createdByStaffId: sale.createdByStaffId,
            createdById: input.staffId,
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
            contractNumber,
            copiedFromSaleId: sourceRecord.id,
            customTerms: sourceRecord.customTerms,
            insuranceRial: sourceRecord.insuranceRial,
            insuranceProvider: sourceRecord.insuranceProvider,
            insurancePolicyNumber: sourceRecord.insurancePolicyNumber,
            insuranceExpiresAt: sourceRecord.insuranceExpiresAt,
            taxRateBps: sourceRecord.taxRateBps,
            taxInclusive: sourceRecord.taxInclusive,
            metadata: sale.metadata,
          },
          tx,
        );

        const newInstallments = await this.installments.saveMany(
          drafts.map((draft) => ({
            id: randomUUID(),
            saleId: draft.saleId,
            tenantId: draft.tenantId,
            sequenceNumber: draft.sequenceNumber,
            dueDate: draft.dueDate,
            amountRial: draft.amountRial,
            status: draft.status as SaveInstallmentPersistenceInput['status'],
            createdById: input.staffId,
          })),
          tx,
        );

        const lineItems = await this.copyRelated.listLineItems(
          input.tenantId,
          sourceRecord.id,
          tx,
        );
        await this.copyRelated.copyLineItemsToSale(
          input.tenantId,
          newSaleRecord.id,
          lineItems,
          input.staffId,
          tx,
        );

        if (copyGuarantors) {
          const guarantors = await this.copyRelated.listGuarantors(
            input.tenantId,
            sourceRecord.id,
            tx,
          );
          await this.copyRelated.copyGuarantorsToSale(
            input.tenantId,
            newSaleRecord.id,
            guarantors,
            input.staffId,
            tx,
          );
        }

        if (copyAttachments) {
          const attachments = await this.contractAttachments.listBySale(
            {
              tenantId: input.tenantId,
              saleId: sourceRecord.id,
            },
            tx,
          );

          for (const attachment of attachments) {
            await this.contractAttachments.create(
              {
                id: randomUUID(),
                tenantId: input.tenantId,
                saleId: newSaleRecord.id,
                fileId: attachment.fileId,
                attachmentType: attachment.attachmentType,
                label: attachment.label,
                description: attachment.description,
                sortOrder: attachment.sortOrder,
                createdById: input.staffId,
                metadata: {
                  copiedFromAttachmentId: attachment.id,
                  copiedFromSaleId: sourceRecord.id,
                },
              },
              tx,
            );
          }
        }

        const refreshedSale = await this.sales.findById(input.tenantId, newSaleRecord.id, tx);
        const saleForSnapshot = refreshedSale ?? newSaleRecord;

        await this.contractVersions.appendVersion(
          {
            tenantId: input.tenantId,
            saleId: newSaleRecord.id,
            versionNumber: 1,
            changeType: 'CREATE',
            changeReason: input.reason.trim(),
            snapshot: buildContractVersionSnapshot(saleForSnapshot, newInstallments),
            createdById: input.staffId,
          },
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.copy',
            entityType: 'sale',
            entityId: sourceRecord.id,
            newValue: {
              sourceSaleId: sourceRecord.id,
              newSaleId: newSaleRecord.id,
              contractNumber,
              reason: input.reason.trim(),
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.create',
            entityType: 'sale',
            entityId: newSaleRecord.id,
            newValue: {
              saleId: newSaleRecord.id,
              copiedFromSaleId: sourceRecord.id,
              contractNumber,
              tenantCustomerId: targetCustomerId,
              branchId: targetBranchId,
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        await this.outbox.publish(
          new SaleCreatedEvent(newSaleRecord.id, {
            saleId: newSaleRecord.id,
            tenantCustomerId: targetCustomerId,
            branchId: targetBranchId,
            totalAmountRial: newSaleRecord.totalAmountRial.toString(),
            installmentCount: newSaleRecord.installmentCount,
          }),
          { tenantId: input.tenantId, aggregateType: 'sale' },
          tx,
        );

        const saleForResponse = refreshedSale ?? newSaleRecord;

        return {
          newSaleId: newSaleRecord.id,
          contractNumber,
          sale: mapSaleToEnterpriseDetail(saleForResponse, newInstallments),
        };
      });

      await this.invalidateDashboardCache(input.tenantId);
      return result;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw mapDomainError(error);
    }
  }

  private async assertBranchAccess(
    tenantId: string,
    branchId: string,
    staffContext: DataScopeStaffContext,
  ): Promise<void> {
    const exists = await this.branches.existsActiveInTenant(tenantId, branchId);
    if (!exists) {
      throw new ApplicationError(
        'BRANCH_TENANT_MISMATCH',
        'Branch is not available for this tenant.',
        422,
      );
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
    const customer = await this.tenantCustomers.findDetailById(tenantCustomerId, tenantId);
    if (!customer) {
      throw new ApplicationError('CUSTOMER_NOT_FOUND', 'Customer was not found for this tenant.', 404);
    }

    if (customer.isBlacklisted) {
      throw new ApplicationError(
        'CUSTOMER_BLACKLISTED',
        'Blacklisted customers cannot have new sales created.',
        403,
      );
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
}
