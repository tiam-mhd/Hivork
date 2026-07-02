export type UploadFileInput = {
  key: string;
  body: Buffer;
  mimeType: string;
  sizeBytes: bigint;
};

export interface IFileStoragePort {
  upload(input: UploadFileInput): Promise<void>;
  getSignedDownloadUrl(key: string, ttlSeconds: number): Promise<string>;
  /** Best-effort cleanup when DB persistence fails after upload. */
  deleteObject(key: string): Promise<void>;
}

export const FILE_STORAGE_PORT = Symbol('FILE_STORAGE_PORT');

export const FILE_SIGNED_DOWNLOAD_TTL_SECONDS = 15 * 60;
