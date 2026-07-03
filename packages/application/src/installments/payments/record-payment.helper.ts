import { createHash } from 'node:crypto';

import type { PaymentMethodDto } from '@hivork/contracts/installments';

import type { PaymentAttemptRecord } from '../../ports/payment-attempt.repository.port.js';

export type PaymentAttemptDetailResult = {
  id: string;
  installmentId: string;
  amountRial: bigint;
  status: string;
  reportedByType: 'staff' | 'customer';
  method: PaymentMethodDto;
  methodDetails: Record<string, unknown> | null;
  note: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  version: number;
};

export type PaymentRecordingSettings = {
  allowPartial: boolean;
  allowBackdate: boolean;
  autoConfirmOnline: boolean;
  onlineSessionTtlMinutes: number;
  voidWindowDays: number;
};

export const DEFAULT_ONLINE_PAYMENT_SESSION_MINUTES = 15;
export const DEFAULT_PAYMENT_VOID_WINDOW_DAYS = 7;

export function resolvePaymentRecordingSettings(
  settings: Record<string, unknown>,
): PaymentRecordingSettings {
  const sessionTtlRaw = settings.payment_online_session_ttl_minutes;
  const sessionTtlMinutes =
    typeof sessionTtlRaw === 'number' && Number.isInteger(sessionTtlRaw) && sessionTtlRaw > 0
      ? sessionTtlRaw
      : DEFAULT_ONLINE_PAYMENT_SESSION_MINUTES;

  const voidWindowRaw = settings.payment_void_window_days;
  const voidWindowDays =
    typeof voidWindowRaw === 'number' && Number.isInteger(voidWindowRaw) && voidWindowRaw >= 0
      ? voidWindowRaw
      : typeof voidWindowRaw === 'string' && /^\d+$/.test(voidWindowRaw)
        ? Number.parseInt(voidWindowRaw, 10)
        : DEFAULT_PAYMENT_VOID_WINDOW_DAYS;

  return {
    allowPartial:
      settings.payment_allow_partial === true || settings.payment_allow_partial === 'true',
    allowBackdate:
      settings.payment_allow_backdate === true || settings.payment_allow_backdate === 'true',
    autoConfirmOnline:
      settings.payment_auto_confirm_online === true ||
      settings.payment_auto_confirm_online === 'true',
    onlineSessionTtlMinutes: sessionTtlMinutes,
    voidWindowDays,
  };
}

export function computeRemainingAmountRial(
  installmentAmountRial: bigint,
  allocatedAmountRial: bigint,
): bigint {
  const remaining = installmentAmountRial - allocatedAmountRial;
  return remaining > 0n ? remaining : 0n;
}

export function mapPaymentAttemptToDetail(record: PaymentAttemptRecord): PaymentAttemptDetailResult {
  const metadata = record.metadata ?? {};
  const method = typeof metadata.method === 'string' ? metadata.method : 'cash';

  return {
    id: record.id,
    installmentId: record.installmentId,
    amountRial: record.amountRial,
    status: record.status.toLowerCase(),
    reportedByType: record.reportedByType.toLowerCase() as 'staff' | 'customer',
    method: method as PaymentMethodDto,
    methodDetails: metadata,
    note: record.note,
    createdAt: record.createdAt,
    confirmedAt: record.confirmedAt,
    version: record.version,
  };
}

export function hashRecordPaymentRequest(input: {
  installmentId: string;
  method: PaymentMethodDto;
  amountRial: bigint;
  note?: string | null;
  evidenceFileId?: string | null;
  paidAt?: Date | null;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        installmentId: input.installmentId,
        method: input.method,
        amountRial: input.amountRial.toString(),
        note: input.note ?? null,
        evidenceFileId: input.evidenceFileId ?? null,
        paidAt: input.paidAt?.toISOString() ?? null,
      }),
    )
    .digest('hex');
}

export function assertIdempotentPaymentMatch(
  existing: PaymentAttemptRecord,
  input: {
    installmentId: string;
    amountRial: bigint;
    method: PaymentMethodDto;
  },
): boolean {
  const metadata = existing.metadata ?? {};
  const existingMethod = typeof metadata.method === 'string' ? metadata.method : null;

  return (
    existing.installmentId === input.installmentId &&
    existing.amountRial === input.amountRial &&
    existingMethod === input.method
  );
}

export function assertIdempotentBankTransferMatch(
  existing: PaymentAttemptRecord,
  input: {
    installmentId: string;
    amountRial: bigint;
    bankName: string;
    referenceNumber: string;
  },
): boolean {
  const metadata = existing.metadata ?? {};

  return (
    existing.installmentId === input.installmentId &&
    existing.amountRial === input.amountRial &&
    metadata.method === 'bank_transfer' &&
    metadata.bankName === input.bankName &&
    metadata.referenceNumber === input.referenceNumber
  );
}

export function assertTransferDateNotFuture(transferDate: string, now = new Date()): void {
  const [year, month, day] = transferDate.split('-').map(Number);
  const transferAt = Date.UTC(year!, month! - 1, day!, 12, 0, 0, 0);
  const todayAt = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    12,
    0,
    0,
    0,
  );

  if (transferAt > todayAt) {
    throw new Error('TRANSFER_DATE_INVALID');
  }
}

export function buildBankTransferMetadata(input: {
  bankName: string;
  referenceNumber: string;
  transferDate: string;
  accountLast4?: string;
  requestHash: string;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    method: 'bank_transfer',
    bankName: input.bankName,
    referenceNumber: input.referenceNumber,
    transferDate: input.transferDate,
    requestHash: input.requestHash,
  };

  if (input.accountLast4) {
    metadata.accountLast4 = input.accountLast4;
  }

  return metadata;
}

export function hashRecordBankTransferRequest(input: {
  installmentId: string;
  amountRial: bigint;
  bankName: string;
  referenceNumber: string;
  transferDate: string;
  accountLast4?: string | null;
  note?: string | null;
  evidenceFileId?: string | null;
  paidAt?: Date | null;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        installmentId: input.installmentId,
        method: 'bank_transfer',
        amountRial: input.amountRial.toString(),
        bankName: input.bankName,
        referenceNumber: input.referenceNumber,
        transferDate: input.transferDate,
        accountLast4: input.accountLast4 ?? null,
        note: input.note ?? null,
        evidenceFileId: input.evidenceFileId ?? null,
        paidAt: input.paidAt?.toISOString() ?? null,
      }),
    )
    .digest('hex');
}

export function buildOnlinePaymentMetadata(input: {
  referenceId: string;
  gateway: string;
  gatewayToken: string;
  redirectUrl: string;
  expiresAt: Date;
  returnUrl: string;
}): Record<string, unknown> {
  return {
    method: 'online',
    referenceId: input.referenceId,
    gateway: input.gateway,
    gatewayToken: input.gatewayToken,
    redirectUrl: input.redirectUrl,
    expiresAt: input.expiresAt.toISOString(),
    returnUrl: input.returnUrl,
    initStatus: 'initiated',
  };
}

export function isOnlinePaymentSessionExpired(
  metadata: Record<string, unknown> | null,
  now = new Date(),
): boolean {
  const expiresAt =
    typeof metadata?.expiresAt === 'string' ? Date.parse(metadata.expiresAt) : Number.NaN;

  if (Number.isNaN(expiresAt)) {
    return false;
  }

  return expiresAt < now.getTime();
}

export function assertIdempotentOnlineInitMatch(
  existing: PaymentAttemptRecord,
  input: {
    installmentId: string;
    amountRial: bigint;
    returnUrl: string;
  },
): boolean {
  const metadata = existing.metadata ?? {};

  return (
    existing.installmentId === input.installmentId &&
    existing.amountRial === input.amountRial &&
    metadata.method === 'online' &&
    metadata.returnUrl === input.returnUrl
  );
}

export function buildPosMetadata(input: {
  terminalId: string;
  traceNumber: string;
  cardLast4?: string;
  batchNumber?: string;
  requestHash: string;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    method: 'pos',
    terminalId: input.terminalId,
    traceNumber: input.traceNumber,
    requestHash: input.requestHash,
  };

  if (input.cardLast4) {
    metadata.cardLast4 = input.cardLast4;
  }

  if (input.batchNumber) {
    metadata.batchNumber = input.batchNumber;
  }

  return metadata;
}

export function assertIdempotentPosMatch(
  existing: PaymentAttemptRecord,
  input: {
    installmentId: string;
    amountRial: bigint;
    terminalId: string;
    traceNumber: string;
  },
): boolean {
  const metadata = existing.metadata ?? {};

  return (
    existing.installmentId === input.installmentId &&
    existing.amountRial === input.amountRial &&
    metadata.method === 'pos' &&
    metadata.terminalId === input.terminalId &&
    metadata.traceNumber === input.traceNumber
  );
}

export function hashRecordPosRequest(input: {
  installmentId: string;
  amountRial: bigint;
  terminalId: string;
  traceNumber: string;
  cardLast4?: string | null;
  batchNumber?: string | null;
  note?: string | null;
  evidenceFileId?: string | null;
  paidAt?: Date | null;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        installmentId: input.installmentId,
        method: 'pos',
        amountRial: input.amountRial.toString(),
        terminalId: input.terminalId,
        traceNumber: input.traceNumber,
        cardLast4: input.cardLast4 ?? null,
        batchNumber: input.batchNumber ?? null,
        note: input.note ?? null,
        evidenceFileId: input.evidenceFileId ?? null,
        paidAt: input.paidAt?.toISOString() ?? null,
      }),
    )
    .digest('hex');
}

export function buildCheckMetadata(input: {
  checkId: string;
  checkNumber: string;
  bankName: string;
  dueDate: string;
  drawerName: string;
  branchCode?: string;
  sayadId?: string;
  requestHash: string;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    method: 'check',
    checkId: input.checkId,
    checkNumber: input.checkNumber,
    bankName: input.bankName,
    dueDate: input.dueDate,
    drawerName: input.drawerName,
    checkPendingRegistration: true,
    requestHash: input.requestHash,
  };

  if (input.branchCode) {
    metadata.branchCode = input.branchCode;
  }

  if (input.sayadId) {
    metadata.sayadId = input.sayadId;
  }

  return metadata;
}

export function assertIdempotentCheckMatch(
  existing: PaymentAttemptRecord,
  input: {
    installmentId: string;
    amountRial: bigint;
    bankName: string;
    checkNumber: string;
  },
): boolean {
  const metadata = existing.metadata ?? {};

  return (
    existing.installmentId === input.installmentId &&
    existing.amountRial === input.amountRial &&
    metadata.method === 'check' &&
    metadata.bankName === input.bankName &&
    metadata.checkNumber === input.checkNumber
  );
}

export function hashRecordCheckRequest(input: {
  installmentId: string;
  amountRial: bigint;
  checkNumber: string;
  bankName: string;
  dueDate: string;
  drawerName: string;
  branchCode?: string | null;
  sayadId?: string | null;
  note?: string | null;
  evidenceFileId?: string | null;
  paidAt?: Date | null;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        installmentId: input.installmentId,
        method: 'check',
        amountRial: input.amountRial.toString(),
        checkNumber: input.checkNumber,
        bankName: input.bankName,
        dueDate: input.dueDate,
        drawerName: input.drawerName,
        branchCode: input.branchCode ?? null,
        sayadId: input.sayadId ?? null,
        note: input.note ?? null,
        evidenceFileId: input.evidenceFileId ?? null,
        paidAt: input.paidAt?.toISOString() ?? null,
      }),
    )
    .digest('hex');
}

export function buildFeeMetadata(input: {
  feeType: string;
  feeDescription: string;
  requestHash: string;
}): Record<string, unknown> {
  return {
    method: 'fee',
    feeType: input.feeType,
    feeDescription: input.feeDescription,
    requestHash: input.requestHash,
  };
}

export function assertIdempotentFeeMatch(
  existing: PaymentAttemptRecord,
  input: {
    installmentId: string;
    amountRial: bigint;
    feeType: string;
    feeDescription: string;
  },
): boolean {
  const metadata = existing.metadata ?? {};

  return (
    existing.installmentId === input.installmentId &&
    existing.amountRial === input.amountRial &&
    metadata.method === 'fee' &&
    metadata.feeType === input.feeType &&
    metadata.feeDescription === input.feeDescription
  );
}

export function hashRecordFeeRequest(input: {
  installmentId: string;
  amountRial: bigint;
  feeType: string;
  feeDescription: string;
  note?: string | null;
  evidenceFileId?: string | null;
  paidAt?: Date | null;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        installmentId: input.installmentId,
        method: 'fee',
        amountRial: input.amountRial.toString(),
        feeType: input.feeType,
        feeDescription: input.feeDescription,
        note: input.note ?? null,
        evidenceFileId: input.evidenceFileId ?? null,
        paidAt: input.paidAt?.toISOString() ?? null,
      }),
    )
    .digest('hex');
}
