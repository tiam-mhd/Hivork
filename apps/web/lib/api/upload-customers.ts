import type { ImportCustomersResultDto } from '@hivork/contracts/customers';

import { ApiClientError, API_URL, toApiClientError } from './client';
import { getAccessToken, getActiveBranchId } from '../auth/session';

export type ImportUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export type ImportCustomersResponse = {
  data: ImportCustomersResultDto;
};

export function createImportIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function uploadCustomersImport(
  file: File,
  idempotencyKey: string,
  options?: {
    onProgress?: (progress: ImportUploadProgress) => void;
    signal?: AbortSignal;
  },
): Promise<ImportCustomersResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_URL}/customers/import`);
    xhr.withCredentials = true;

    const token = getAccessToken();
    const branchId = getActiveBranchId();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    if (branchId) {
      xhr.setRequestHeader('X-Branch-Id', branchId);
    }
    xhr.setRequestHeader('Idempotency-Key', idempotencyKey);

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
        resolve(body as ImportCustomersResponse);
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
