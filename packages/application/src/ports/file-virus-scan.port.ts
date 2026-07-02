export type FileVirusScanInput = {
  storageKey: string;
  mimeType: string;
  sizeBytes: bigint;
  tenantId: string;
};

/** Async virus-scan hook — no-op in MVP; replace with queue worker when infra exists. */
export interface IFileVirusScanPort {
  enqueueScan(input: FileVirusScanInput): Promise<void>;
}

export const FILE_VIRUS_SCAN_PORT = Symbol('FILE_VIRUS_SCAN_PORT');
