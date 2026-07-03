import { randomUUID } from 'node:crypto';

import type { CreateSettlementBatchResponseDto } from '@hivork/contracts/payments';
import { mapUnifiedMethodToInternal } from '@hivork/contracts/payments';
import { jalaliInputToIso, parseJalaliDateToIso, toWesternDigits } from '@hivork/i18n';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ISettlementBatchRepository } from '../ports/settlement-batch.repository.port.js';
import {
  SETTLEMENT_BATCH_SEQUENCE_KEY,
  type ITenantSequenceRepository,
} from '../ports/tenant-sequence.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import {
  formatSettlementBatchNumber,
} from './format-settlement-batch-number.js';

export type CreateSettlementBatchInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  periodFrom: string;
  periodTo: string;
  paymentMethods: Array<'card' | 'online'>;
  note?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type CreateSettlementBatchResult = CreateSettlementBatchResponseDto;

function parseJalaliDateInput(value: string): Date | null {
  const normalized = toWesternDigits(value).trim();
  const dashMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  const iso = dashMatch
    ? jalaliInputToIso(Number(dashMatch[1]), Number(dashMatch[2]), Number(dashMatch[3]))
    : parseJalaliDateToIso(normalized);

  if (!iso) {
    return null;
  }

  return new Date(`${iso}T00:00:00.000Z`);
}

function parseJalaliDateInputEnd(value: string): Date | null {
  const normalized = toWesternDigits(value).trim();
  const dashMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  const iso = dashMatch
    ? jalaliInputToIso(Number(dashMatch[1]), Number(dashMatch[2]), Number(dashMatch[3]))
    : parseJalaliDateToIso(normalized);

  if (!iso) {
    return null;
  }

  return new Date(`${iso}T23:59:59.999Z`);
}

function mapInternalPaymentMethods(methods: Array<'card' | 'online'>): string[] {
  return [...new Set(methods.map((method) => mapUnifiedMethodToInternal(method)))];
}

export class CreateSettlementBatchUseCase
  implements UseCase<CreateSettlementBatchInput, CreateSettlementBatchResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly settlements: ISettlementBatchRepository,
    private readonly branches: IBranchReader,
    private readonly sequences: ITenantSequenceRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateSettlementBatchInput): Promise<CreateSettlementBatchResult> {
    const periodFrom = parseJalaliDateInput(input.periodFrom);
    const periodTo = parseJalaliDateInputEnd(input.periodTo);

    if (!periodFrom || !periodTo) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid Jalali date in request.', 400);
    }

    if (periodFrom > periodTo) {
      throw new ApplicationError(
        'DATE_RANGE_INVALID',
        'periodFrom must be on or before periodTo.',
        400,
      );
    }

    await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

    const internalMethods = mapInternalPaymentMethods(input.paymentMethods);
    const eligible = await this.settlements.findEligibleLedgerEntries({
      tenantId: input.tenantId,
      branchId: input.branchId,
      paymentMethods: internalMethods,
      periodFrom,
      periodTo,
    });

    if (eligible.length === 0) {
      throw new ApplicationError(
        'SETTLEMENT_EMPTY',
        'No eligible ledger entries found for settlement.',
        400,
      );
    }

    const ledgerEntryIds = eligible.map((entry) => entry.id);
    const alreadySettled = await this.settlements.findLedgerEntriesInOpenBatch(
      input.tenantId,
      ledgerEntryIds,
    );

    if (alreadySettled.length > 0) {
      throw new ApplicationError(
        'ENTRY_ALREADY_SETTLED',
        'One or more ledger entries are already in an open settlement batch.',
        409,
        { ledgerEntryIds: alreadySettled },
      );
    }

    const totalAmountRial = eligible.reduce((sum, entry) => sum + entry.amountRial, 0n);
    const batchId = randomUUID();

    const batch = await this.unitOfWork.transaction(async (tx) => {
      const sequence = await this.sequences.allocateNextValue(
        input.tenantId,
        SETTLEMENT_BATCH_SEQUENCE_KEY,
        tx,
      );
      const batchNumber = formatSettlementBatchNumber(sequence, periodTo);

      const created = await this.settlements.createWithEntries(
        {
          id: batchId,
          tenantId: input.tenantId,
          branchId: input.branchId,
          batchNumber,
          periodFrom,
          periodTo,
          totalAmountRial,
          entryCount: eligible.length,
          note: input.note?.trim() || null,
          paymentMethods: input.paymentMethods,
          ledgerEntryIds,
          createdById: input.staffId,
        },
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'settlement.create',
          entityType: 'SettlementBatch',
          entityId: created.id,
          newValue: {
            batchNumber: created.batchNumber,
            entryCount: created.entryCount,
            totalAmountRial: created.totalAmountRial.toString(),
          },
          metadata: {
            branchId: input.branchId,
            paymentMethods: input.paymentMethods,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return created;
    });

    return {
      settlement: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        status: 'open',
        totalAmountRial: batch.totalAmountRial.toString(),
        entryCount: batch.entryCount,
      },
    };
  }

  private async assertBranchAccess(
    tenantId: string,
    branchId: string,
    staffContext: DataScopeStaffContext,
  ): Promise<void> {
    const exists = await this.branches.existsActiveInTenant(tenantId, branchId);
    if (!exists) {
      throw new ApplicationError(
        'BRANCH_ACCESS_DENIED',
        'Branch is not available for this tenant.',
        403,
      );
    }

    if (staffContext.dataScope === 'all') {
      return;
    }

    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0 && !effective.includes(branchId)) {
      throw new ApplicationError(
        'BRANCH_ACCESS_DENIED',
        'Branch is not assigned to this staff.',
        403,
      );
    }
  }
}
