import { createHash } from 'node:crypto';

import {
  assertCustomerMergeAllowed,
  mergeCustomerFields,
  type CustomerMergeSnapshot,
} from '@hivork/domain';
import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { ICustomerMergeIdempotencyStore } from '../ports/customer-merge-idempotency.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerMergeRepository } from '../ports/tenant-customer-merge.repository.port.js';
import type {
  ITenantCustomerRepository,
  TenantCustomerFullDetail,
} from '../ports/tenant-customer.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';
import { maskCustomerAuditRecord } from './customer-audit-mask.js';
import type { GetTenantCustomerUseCase } from './get-tenant-customer.use-case.js';

export type MergeTenantCustomersInput = {
  tenantId: string;
  sourceTenantCustomerId: string;
  targetTenantCustomerId: string;
  reason: string;
  actorId: string;
  idempotencyKey: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type MergeTenantCustomersOutput = {
  customer: TenantCustomerFullDetail;
  mergedSalesCount: number;
  mergedDocumentsCount: number;
};

export class MergeTenantCustomersUseCase
  implements UseCase<MergeTenantCustomersInput, MergeTenantCustomersOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly mergeRepository: ITenantCustomerMergeRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly audit: AuditService,
    private readonly idempotency: ICustomerMergeIdempotencyStore,
    private readonly getTenantCustomer: GetTenantCustomerUseCase,
  ) {}

  async execute(input: MergeTenantCustomersInput): Promise<MergeTenantCustomersOutput> {
    const requestHash = this.buildRequestHash(input);
    const cached = await this.idempotency.find(input.tenantId, input.idempotencyKey);

    if (cached) {
      if (cached.requestHash !== requestHash) {
        throw new ApplicationError(
          'IDEMPOTENCY_CONFLICT',
          'This idempotency key was already used with different merge parameters.',
          409,
        );
      }

      const customer = await this.getTenantCustomer.execute({
        tenantId: input.tenantId,
        tenantCustomerId: cached.response.targetCustomerId,
        staffContext: input.staffContext,
      });

      return {
        customer,
        mergedSalesCount: cached.response.mergedSalesCount,
        mergedDocumentsCount: cached.response.mergedDocumentsCount,
      };
    }

    const source = await this.tenantCustomers.findFullDetailById(
      input.sourceTenantCustomerId,
      input.tenantId,
    );
    const target = await this.tenantCustomers.findFullDetailById(
      input.targetTenantCustomerId,
      input.tenantId,
    );

    if (!source || !target) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await assertTenantCustomerInScope(source, input.staffContext, input.actorId, this.sales);
    await assertTenantCustomerInScope(target, input.staffContext, input.actorId, this.sales);

    const snapshot: CustomerMergeSnapshot = {
      sourceId: source.id,
      targetId: target.id,
      sourceTags: source.tags,
      targetTags: target.tags,
      sourceNotes: source.notes,
      targetNotes: target.notes,
      sourceInternalNotes: source.internalNotes,
      targetInternalNotes: target.internalNotes,
      sourceCreditScore: source.creditScore,
      targetCreditScore: target.creditScore,
      sourceOverdueCount: source.overdueCount,
      targetOverdueCount: target.overdueCount,
      sourceTotalPurchaseRial: source.totalPurchaseRial,
      targetTotalPurchaseRial: target.totalPurchaseRial,
      sourceLastPurchaseAt: source.lastPurchaseAt,
      targetLastPurchaseAt: target.lastPurchaseAt,
      sourceMetadata: source.metadata,
      targetMetadata: target.metadata,
      sourceStatus: source.status,
      targetStatus: target.status,
      sourceIsBlacklisted: source.isBlacklisted,
      targetIsBlacklisted: target.isBlacklisted,
      sourceDeletedAt: source.deletedAt,
      targetDeletedAt: target.deletedAt,
    };

    try {
      assertCustomerMergeAllowed(snapshot);
    } catch (error) {
      throw mapDomainError(error);
    }

    const pendingPayments = await this.sales.countPendingPaymentAttemptsForCustomer(
      input.tenantId,
      input.sourceTenantCustomerId,
    );

    if (pendingPayments > 0) {
      throw new ApplicationError(
        'MERGE_PENDING_PAYMENTS',
        'Cannot merge customer while pending payment approvals exist on source sales.',
        409,
        { pendingPaymentsCount: pendingPayments },
      );
    }

    const mergedAt = new Date();
    const mergedFields = mergeCustomerFields(snapshot, {
      reason: input.reason,
      actorId: input.actorId,
      mergedAt,
    });

    const deleteReason = `merged into ${target.id}`;

    const { mergedSalesCount, mergedDocumentsCount } = await this.unitOfWork.transaction(
      async (tx) => {
        const salesCount = await this.sales.reassignTenantCustomer(
          input.tenantId,
          input.sourceTenantCustomerId,
          input.targetTenantCustomerId,
          input.actorId,
          tx,
        );

        const related = await this.mergeRepository.reassignRelatedRecords(
          {
            tenantId: input.tenantId,
            sourceTenantCustomerId: input.sourceTenantCustomerId,
            targetTenantCustomerId: input.targetTenantCustomerId,
            updatedById: input.actorId,
          },
          tx,
        );

        await this.tenantCustomers.updateLink(
          {
            id: target.id,
            tenantId: input.tenantId,
            version: target.version,
            updatedById: input.actorId,
            tags: mergedFields.tags,
            notes: mergedFields.notes,
            internalNotes: mergedFields.internalNotes,
            metadata: mergedFields.metadata,
            creditScore: mergedFields.creditScore,
            overdueCount: mergedFields.overdueCount,
            totalPurchaseRial: mergedFields.totalPurchaseRial,
            lastPurchaseAt: mergedFields.lastPurchaseAt,
          },
          tx,
        );

        await this.tenantCustomers.softDelete(
          {
            id: source.id,
            tenantId: input.tenantId,
            deletedById: input.actorId,
            deleteReason,
            expectedVersion: source.version,
          },
          tx,
        );

        return {
          mergedSalesCount: salesCount,
          mergedDocumentsCount: related.documentsCount,
        };
      },
    );

    const customer = await this.getTenantCustomer.execute({
      tenantId: input.tenantId,
      tenantCustomerId: target.id,
      staffContext: input.staffContext,
    });

    const output: MergeTenantCustomersOutput = {
      customer,
      mergedSalesCount,
      mergedDocumentsCount,
    };

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.merge',
      entityType: 'tenant_customer',
      entityId: target.id,
      oldValue: maskCustomerAuditRecord({
        sourceTenantCustomerId: source.id,
        targetTenantCustomerId: target.id,
        sourceGlobalCustomerId: source.globalCustomerId,
        targetGlobalCustomerId: target.globalCustomerId,
      }),
      newValue: {
        mergedSalesCount,
        mergedDocumentsCount,
        reason: input.reason.trim(),
        deleteReason,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    await this.idempotency.store(input.tenantId, input.idempotencyKey, requestHash, {
      targetCustomerId: target.id,
      mergedSalesCount,
      mergedDocumentsCount,
    });

    return output;
  }

  private buildRequestHash(input: MergeTenantCustomersInput): string {
    return createHash('sha256')
      .update(
        `${input.sourceTenantCustomerId}:${input.targetTenantCustomerId}:${input.reason.trim()}`,
      )
      .digest('hex');
  }
}
