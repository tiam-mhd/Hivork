import { Check, CheckStatus, CheckType, type CheckProps } from '@hivork/domain';

import type { CheckRecord } from '../ports/check.repository.port.js';

const STATUS_FROM_RECORD: Record<CheckRecord['status'], CheckStatus> = {
  REGISTERED: CheckStatus.REGISTERED,
  DUE: CheckStatus.DUE,
  COLLECTED: CheckStatus.COLLECTED,
  BOUNCED: CheckStatus.BOUNCED,
  TRANSFERRED: CheckStatus.TRANSFERRED,
  CANCELLED: CheckStatus.CANCELLED,
};

export function checkRecordToProps(record: CheckRecord): CheckProps {
  return {
    id: record.id,
    tenantId: record.tenantId,
    branchId: record.branchId,
    checkType: record.checkType === 'RECEIVED' ? CheckType.RECEIVED : CheckType.PAYABLE,
    status: STATUS_FROM_RECORD[record.status],
    checkNumber: record.checkNumber,
    bankName: record.bankName,
    bankBranchCode: record.bankBranchCode,
    amountRial: record.amountRial,
    dueDate: record.dueDate,
    drawerName: record.drawerName,
    payeeName: record.payeeName,
    sayadId: record.sayadId,
    paymentAttemptId: record.paymentAttemptId,
    ledgerEntryId: record.ledgerEntryId,
    installmentId: record.installmentId,
    saleId: record.saleId,
    imageFileId: record.imageFileId,
    collectedAt: record.collectedAt,
    collectedByStaffId: null,
    bouncedAt: record.bouncedAt,
    bounceReason: record.bounceReason,
    transferredTo: record.transferredTo,
    transferredAt: record.transferredAt,
    transferredByStaffId: null,
    cancelledAt: null,
    cancelledByStaffId: null,
    trackingNotes: record.trackingNotes,
    version: record.version,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdById: null,
  };
}

export function reconstituteCheckFromRecord(record: CheckRecord): Check {
  return Check.reconstitute(checkRecordToProps(record));
}
