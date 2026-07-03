import type { CheckSummaryDto } from '@hivork/contracts/payments';

import type { CheckRecord } from '../ports/check.repository.port.js';

function mapCheckTypeToApi(type: CheckRecord['checkType']): CheckSummaryDto['checkType'] {
  return type === 'RECEIVED' ? 'received' : 'payable';
}

function mapCheckStatusToApi(status: CheckRecord['status']): CheckSummaryDto['status'] {
  switch (status) {
    case 'REGISTERED':
      return 'registered';
    case 'DUE':
      return 'due';
    case 'COLLECTED':
      return 'collected';
    case 'BOUNCED':
      return 'bounced';
    case 'TRANSFERRED':
      return 'transferred';
    case 'CANCELLED':
      return 'cancelled';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function mapCheckToSummary(check: CheckRecord): CheckSummaryDto {
  return {
    id: check.id,
    checkType: mapCheckTypeToApi(check.checkType),
    status: mapCheckStatusToApi(check.status),
    checkNumber: check.checkNumber,
    bankName: check.bankName,
    amountRial: check.amountRial.toString(),
    dueDate: check.dueDate.toISOString(),
    branchId: check.branchId,
    installmentId: check.installmentId,
    paymentAttemptId: check.paymentAttemptId,
    drawerName: check.drawerName,
    ...(check.bankBranchCode ? { bankBranchCode: check.bankBranchCode } : {}),
    ...(check.sayadId ? { sayadId: check.sayadId } : {}),
    ...(check.trackingNotes ? { note: check.trackingNotes } : {}),
  };
}

export function mapCheckToRegisterResponse(check: CheckRecord): {
  check: Pick<
    CheckSummaryDto,
    'id' | 'checkType' | 'status' | 'checkNumber' | 'amountRial' | 'dueDate'
  >;
} {
  const summary = mapCheckToSummary(check);
  return {
    check: {
      id: summary.id,
      checkType: summary.checkType,
      status: summary.status,
      checkNumber: summary.checkNumber,
      amountRial: summary.amountRial,
      dueDate: summary.dueDate,
    },
  };
}
