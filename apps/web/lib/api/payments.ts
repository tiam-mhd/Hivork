import type {
  AddCheckTrackingNoteBodyDto,
  AddCheckTrackingNoteResponseDto,
  CheckStatusDto,
  CheckTypeDto,
  CollectCheckBodyDto,
  CollectCheckResponseDto,
  GetCheckImageResponseDto,
  GetCheckTrackingResponseDto,
  ListChecksResponseDto,
  ListPaymentTransactionsResponseDto,
  ListSettlementBatchesResponseDto,
  MarkCheckBouncedBodyDto,
  MarkCheckBouncedResponseDto,
  PaymentLedgerEntryStatusDto,
  PaymentLedgerEntryTypeDto,
  RefundPaymentBodyDto,
  RefundPaymentResponseDto,
  RegisterPayableCheckBodyDto,
  RegisterPayableCheckResponseDto,
  RegisterReceivedCheckBodyDto,
  RegisterReceivedCheckResponseDto,
  GetReconciliationReportResponseDto,
  ResolveDiscrepancyBodyDto,
  ResolveDiscrepancyResponseDto,
  RunReconciliationResponseDto,
  CreateSettlementBatchBodyDto,
  CreateSettlementBatchResponseDto,
  GetSettlementBatchResponseDto,
  CloseSettlementBatchBodyDto,
  CloseSettlementBatchResponseDto,
  TransferCheckBodyDto,
  TransferCheckResponseDto,
  UploadCheckImageResponseDto,
  VoidLedgerTransactionBodyDto,
  VoidLedgerTransactionResponseDto,
} from '@hivork/contracts/payments';

import { ApiClientError, API_URL, apiFetch, toApiClientError } from './client';
import { getDeviceIdHeader } from '../auth/device-id';
import { getAccessToken, getActiveBranchId } from '../auth/session';

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export type ListPaymentTransactionsParams = {
  cursor?: string;
  limit?: number;
  status?: PaymentLedgerEntryStatusDto;
  entryType?: PaymentLedgerEntryTypeDto;
  paymentMethod?: string;
  branchId?: string;
  occurredFrom?: string;
  occurredTo?: string;
  search?: string;
};

export async function listPaymentTransactions(
  params: ListPaymentTransactionsParams = {},
): Promise<ListPaymentTransactionsResponseDto> {
  return apiFetch(
    `/payments/transactions${buildQuery({
      cursor: params.cursor,
      limit: params.limit?.toString(),
      status: params.status,
      entryType: params.entryType,
      paymentMethod: params.paymentMethod,
      branchId: params.branchId,
      occurredFrom: params.occurredFrom,
      occurredTo: params.occurredTo,
      search: params.search,
    })}`,
  );
}

export async function refundPaymentTransaction(
  ledgerEntryId: string,
  body: RefundPaymentBodyDto,
  idempotencyKey?: string,
): Promise<RefundPaymentResponseDto> {
  return apiFetch(`/payments/transactions/${ledgerEntryId}/refund`, {
    method: 'POST',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    body: JSON.stringify(body),
  });
}

export async function voidPaymentTransaction(
  ledgerEntryId: string,
  body: VoidLedgerTransactionBodyDto,
): Promise<VoidLedgerTransactionResponseDto> {
  return apiFetch(`/payments/transactions/${ledgerEntryId}/void`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type ListChecksParams = {
  cursor?: string;
  limit?: number;
  checkType?: CheckTypeDto;
  status?: CheckStatusDto;
  dueFrom?: string;
  dueTo?: string;
};

export async function listChecks(params: ListChecksParams = {}): Promise<ListChecksResponseDto> {
  return apiFetch(
    `/checks${buildQuery({
      cursor: params.cursor,
      limit: params.limit?.toString(),
      checkType: params.checkType,
      status: params.status,
      dueFrom: params.dueFrom,
      dueTo: params.dueTo,
    })}`,
  );
}

export async function registerReceivedCheck(
  body: RegisterReceivedCheckBodyDto,
): Promise<RegisterReceivedCheckResponseDto> {
  return apiFetch('/checks/received', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function registerPayableCheck(
  body: RegisterPayableCheckBodyDto,
): Promise<RegisterPayableCheckResponseDto> {
  return apiFetch('/checks/payable', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function collectCheck(
  checkId: string,
  body: CollectCheckBodyDto,
  idempotencyKey: string,
): Promise<CollectCheckResponseDto> {
  return apiFetch(`/checks/${checkId}/collect`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  });
}

export async function bounceCheck(
  checkId: string,
  body: MarkCheckBouncedBodyDto,
): Promise<MarkCheckBouncedResponseDto> {
  return apiFetch(`/checks/${checkId}/bounce`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function transferCheck(
  checkId: string,
  body: TransferCheckBodyDto,
): Promise<TransferCheckResponseDto> {
  return apiFetch(`/checks/${checkId}/transfer`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getCheckTracking(checkId: string): Promise<GetCheckTrackingResponseDto> {
  return apiFetch(`/checks/${checkId}/tracking`);
}

export async function addCheckTrackingNote(
  checkId: string,
  body: AddCheckTrackingNoteBodyDto,
): Promise<AddCheckTrackingNoteResponseDto> {
  return apiFetch(`/checks/${checkId}/tracking-notes`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getCheckImage(checkId: string): Promise<GetCheckImageResponseDto> {
  return apiFetch(`/checks/${checkId}/image`);
}

export function uploadCheckImage(
  checkId: string,
  file: File,
  options?: { signal?: AbortSignal },
): Promise<UploadCheckImageResponseDto> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_URL}/checks/${checkId}/image`);
    xhr.withCredentials = true;

    const token = getAccessToken();
    const branchId = getActiveBranchId();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    if (branchId) xhr.setRequestHeader('X-Branch-Id', branchId);
    Object.entries(getDeviceIdHeader()).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadCheckImageResponseDto);
        return;
      }
      reject(toApiClientError(body, xhr.statusText, xhr.status));
    };

    xhr.onerror = () => {
      reject(new ApiClientError('SERVICE_UNAVAILABLE', 'خطا در ارتباط با سرور.', 0));
    };

    if (options?.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(formData);
  });
}

export async function listSettlementBatches(params: {
  cursor?: string;
  limit?: number;
  branchId?: string;
  status?: 'open' | 'closed';
} = {}): Promise<ListSettlementBatchesResponseDto> {
  return apiFetch(
    `/payments/settlements${buildQuery({
      cursor: params.cursor,
      limit: params.limit?.toString(),
      branchId: params.branchId,
      status: params.status,
    })}`,
  );
}

export async function createSettlementBatch(
  body: CreateSettlementBatchBodyDto,
): Promise<CreateSettlementBatchResponseDto> {
  return apiFetch('/payments/settlements', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getSettlementBatch(
  settlementId: string,
): Promise<GetSettlementBatchResponseDto> {
  return apiFetch(`/payments/settlements/${settlementId}`);
}

export async function closeSettlementBatch(
  settlementId: string,
  body: CloseSettlementBatchBodyDto,
): Promise<CloseSettlementBatchResponseDto> {
  return apiFetch(`/payments/settlements/${settlementId}/close`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function runSettlementReconciliation(
  settlementId: string,
  file: File,
): Promise<RunReconciliationResponseDto> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('bankStatementFile', file);
    formData.append('encoding', 'utf-8');

    xhr.open('POST', `${API_URL}/payments/settlements/${settlementId}/reconcile`);
    xhr.withCredentials = true;

    const token = getAccessToken();
    const branchId = getActiveBranchId();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    if (branchId) xhr.setRequestHeader('X-Branch-Id', branchId);
    Object.entries(getDeviceIdHeader()).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as RunReconciliationResponseDto);
        return;
      }
      reject(toApiClientError(body, xhr.statusText, xhr.status));
    };

    xhr.onerror = () => {
      reject(new ApiClientError('SERVICE_UNAVAILABLE', 'خطا در ارتباط با سرور.', 0));
    };

    xhr.send(formData);
  });
}

export async function getReconciliationReport(
  reportId: string,
): Promise<GetReconciliationReportResponseDto> {
  return apiFetch(`/payments/reconciliations/${reportId}`);
}

export async function resolveReconciliationDiscrepancy(
  discrepancyId: string,
  body: ResolveDiscrepancyBodyDto,
): Promise<ResolveDiscrepancyResponseDto> {
  return apiFetch(`/payments/reconciliations/discrepancies/${discrepancyId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
