import { ApiClientError, toApiClientError } from './client';
import { getDeviceIdHeader } from '../auth/device-id';
import { getAccessToken, getActiveBranchId } from '../auth/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function parseFilename(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) {
    return undefined;
  }

  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1];
}

export type ApiDownloadResult = {
  blob: Blob;
  filename?: string;
  rowCount?: number;
};

export async function apiDownload(path: string, init?: RequestInit): Promise<ApiDownloadResult> {
  const token = getAccessToken();
  const branchId = getActiveBranchId();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getDeviceIdHeader(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(branchId ? { 'X-Branch-Id': branchId } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw toApiClientError(body, response.statusText, response.status);
  }

  const blob = await response.blob();
  const rowCountHeader = response.headers.get('X-Export-Row-Count');
  const rowCount = rowCountHeader ? Number(rowCountHeader) : undefined;

  return {
    blob,
    filename: parseFilename(response.headers.get('Content-Disposition')),
    rowCount: Number.isFinite(rowCount) ? rowCount : undefined,
  };
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export { ApiClientError };
