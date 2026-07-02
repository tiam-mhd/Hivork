import type {
  CustomerDocumentDownloadResponseDto,
  CustomerDocumentDto,
  CustomerDocumentListResponseDto,
  CustomerDocumentTypeDto,
  UploadCustomerDocumentBodyDto,
} from '@hivork/contracts/customers';

import { ApiClientError, API_URL, apiFetch, toApiClientError } from './client';
import { getDeviceIdHeader } from '../auth/device-id';
import { getAccessToken, getActiveBranchId } from '../auth/session';

export type CustomerDocumentUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export type CustomerDocumentUploadInput = UploadCustomerDocumentBodyDto & {
  file: File;
};

export async function listCustomerDocuments(
  customerId: string,
  options?: { documentType?: CustomerDocumentTypeDto },
): Promise<CustomerDocumentDto[]> {
  const params = new URLSearchParams();
  if (options?.documentType) {
    params.set('documentType', options.documentType);
  }

  const query = params.toString();
  const response = await apiFetch<CustomerDocumentListResponseDto>(
    `/customers/${customerId}/documents${query ? `?${query}` : ''}`,
  );

  return response.data;
}

export function uploadCustomerDocument(
  customerId: string,
  input: CustomerDocumentUploadInput,
  options?: {
    onProgress?: (progress: CustomerDocumentUploadProgress) => void;
    signal?: AbortSignal;
  },
): Promise<{ data: CustomerDocumentDto }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('documentType', input.documentType);
    if (input.description?.trim()) {
      formData.append('description', input.description.trim());
    }
    if (input.expiresAt) {
      formData.append('expiresAt', input.expiresAt);
    }

    xhr.open('POST', `${API_URL}/customers/${customerId}/documents`);
    xhr.withCredentials = true;

    const token = getAccessToken();
    const branchId = getActiveBranchId();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    if (branchId) {
      xhr.setRequestHeader('X-Branch-Id', branchId);
    }
    Object.entries(getDeviceIdHeader()).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options?.onProgress) {
        return;
      }
      options.onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
      });
    };

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as { data: CustomerDocumentDto });
        return;
      }

      reject(toApiClientError(body, xhr.statusText, xhr.status));
    };

    xhr.onerror = () => {
      reject(new ApiClientError('SERVICE_UNAVAILABLE', 'خطا در ارتباط با سرور.', 0));
    };

    xhr.onabort = () => {
      reject(new ApiClientError('REQUEST_ABORTED', 'آپلود لغو شد.', 0));
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

export async function deleteCustomerDocument(
  customerId: string,
  documentId: string,
  deleteReason?: string,
): Promise<{ data: { id: string; deletedAt: string } }> {
  return apiFetch(`/customers/${customerId}/documents/${documentId}`, {
    method: 'DELETE',
    body: JSON.stringify(deleteReason ? { deleteReason } : {}),
  });
}

export async function getCustomerDocumentDownloadUrl(
  customerId: string,
  documentId: string,
): Promise<CustomerDocumentDownloadResponseDto['data']> {
  const response = await apiFetch<CustomerDocumentDownloadResponseDto>(
    `/customers/${customerId}/documents/${documentId}/download`,
  );
  return response.data;
}
