import { randomUUID } from 'node:crypto';

import type { InstallmentOperationSnapshot } from '@hivork/domain';

import {
  generateRegeneratedInstallmentSchedule,
  InstallmentOperationErrorCode,
  InstallmentOperationsService,
  InstallmentStatus,
  MergeSplitPolicy,
  SaleStatus,
  type RegenerateRoundingPolicy,
} from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import type { InstallmentRecord } from '../ports/installment.repository.port.js';
import type { SaleRecord } from '../ports/sale.repository.port.js';
import { parseDateOnlyUtc } from './sales/contract-version-snapshot.helper.js';
import {
  installmentRecordToOperationSnapshot,
  serializeOperationSnapshots,
} from './installment-operation-snapshot.helper.js';

export type RegenerateScheduleInput = {
  firstDueDate?: string;
  installmentCount?: number;
  intervalDays?: number;
  customDueDates?: string[];
};

export type BuildRegeneratePlanInput = {
  sale: SaleRecord;
  installments: InstallmentRecord[];
  schedule: RegenerateScheduleInput;
  roundingPolicy: RegenerateRoundingPolicy;
  policy: MergeSplitPolicy;
  maxSequenceNumber: number;
};

export type RegeneratePlanInstallment = {
  id: string;
  sequenceNumber: number;
  dueDate: Date;
  amountRial: bigint;
  status: 'PENDING';
};

export type RegeneratePlan = {
  saleId: string;
  removedInstallmentIds: string[];
  removedSnapshots: ReturnType<typeof serializeOperationSnapshots>;
  newInstallments: RegeneratePlanInstallment[];
  newSnapshots: ReturnType<typeof serializeOperationSnapshots>;
  totalAmountRial: bigint;
  remainingSequenceNumbers: number[];
};

const OPERABLE_STATUSES = new Set(['PENDING', 'OVERDUE']);

function mapRegenerateValidationError(code: string): ApplicationError {
  switch (code) {
    case InstallmentOperationErrorCode.REGENERATE_PAID_BLOCKED:
      return new ApplicationError(
        InstallmentOperationErrorCode.REGENERATE_PAID_BLOCKED,
        'Paid or waived installments cannot be regenerated.',
        409,
      );
    case InstallmentOperationErrorCode.SALE_STATUS_INVALID:
      return new ApplicationError(
        'SALE_NOT_ACTIVE',
        'Sale is not active for installment regeneration.',
        409,
      );
    case InstallmentOperationErrorCode.AMOUNT_MISMATCH:
      return new ApplicationError(
        InstallmentOperationErrorCode.AMOUNT_MISMATCH,
        'Regenerated installment amounts do not match the remaining total.',
        500,
      );
    case InstallmentOperationErrorCode.SEQUENCE_NUMBER_DUPLICATE:
      return new ApplicationError(
        InstallmentOperationErrorCode.SEQUENCE_NUMBER_DUPLICATE,
        'Generated installment sequence numbers are not unique.',
        409,
      );
    default:
      return new ApplicationError(code, 'Installment regeneration is not allowed.', 409);
  }
}

export function buildRegeneratePlan(input: BuildRegeneratePlanInput): RegeneratePlan {
  if (input.sale.status !== 'ACTIVE' || input.sale.archivedAt) {
    throw new ApplicationError(
      'SALE_NOT_ACTIVE',
      'Sale is not active for installment regeneration.',
      409,
    );
  }

  const affectedInstallments = input.installments.filter((installment) =>
    OPERABLE_STATUSES.has(installment.status),
  );

  if (affectedInstallments.length === 0) {
    throw new ApplicationError(
      'NO_INSTALLMENTS_TO_REGENERATE',
      'Sale has no pending or overdue installments to regenerate.',
      400,
    );
  }

  const installmentCount =
    input.schedule.customDueDates?.length ?? input.schedule.installmentCount ?? 0;

  if (!Number.isInteger(installmentCount) || installmentCount < 1) {
    throw new ApplicationError('SCHEDULE_INVALID', 'Installment schedule is invalid.', 400);
  }

  const remainingRial = affectedInstallments.reduce(
    (total, installment) => total + installment.amountRial,
    0n,
  );
  const startSequenceNumber = input.maxSequenceNumber + 1;

  const generated = generateRegeneratedInstallmentSchedule({
    totalAmountRial: remainingRial,
    installmentCount,
    startSequenceNumber,
    roundingPolicy: input.roundingPolicy,
    ...(input.schedule.customDueDates?.length
      ? {
          customDueDates: input.schedule.customDueDates.map((value) => parseDateOnlyUtc(value)),
        }
      : {
          firstDueDate: parseDateOnlyUtc(input.schedule.firstDueDate!),
          intervalDays: input.schedule.intervalDays!,
        }),
  });

  const affectedSnapshots: InstallmentOperationSnapshot[] = affectedInstallments.map(
    installmentRecordToOperationSnapshot,
  );
  const validation = InstallmentOperationsService.validateRegenerate({
    saleId: input.sale.id,
    saleStatus: SaleStatus.ACTIVE,
    affectedInstallments: affectedSnapshots,
    newAmountsRial: generated.map((item) => item.amountRial),
    policy: input.policy,
  });

  if (!validation.ok) {
    throw mapRegenerateValidationError(validation.error);
  }

  const keptSequenceNumbers = input.installments
    .filter((installment) => !OPERABLE_STATUSES.has(installment.status))
    .map((installment) => installment.sequenceNumber);
  const newSequenceNumbers = generated.map((item) => item.sequenceNumber);
  const sequenceValidation = InstallmentOperationsService.validateUniqueSequenceNumbers({
    sequenceNumbers: [...keptSequenceNumbers, ...newSequenceNumbers],
  });

  if (!sequenceValidation.ok) {
    throw mapRegenerateValidationError(sequenceValidation.error);
  }

  const newInstallments: RegeneratePlanInstallment[] = generated.map((item) => ({
    id: randomUUID(),
    sequenceNumber: item.sequenceNumber,
    dueDate: item.dueDate,
    amountRial: item.amountRial,
    status: 'PENDING',
  }));

  const newSnapshots = serializeOperationSnapshots(
    newInstallments.map((item) => ({
      id: item.id,
      saleId: input.sale.id,
      sequenceNumber: item.sequenceNumber,
      dueDate: item.dueDate,
      amountRial: item.amountRial,
      status: InstallmentStatus.PENDING,
    })),
  );

  return {
    saleId: input.sale.id,
    removedInstallmentIds: affectedInstallments.map((installment) => installment.id),
    removedSnapshots: serializeOperationSnapshots(affectedSnapshots),
    newInstallments,
    newSnapshots,
    totalAmountRial: remainingRial,
    remainingSequenceNumbers: newSequenceNumbers,
  };
}
