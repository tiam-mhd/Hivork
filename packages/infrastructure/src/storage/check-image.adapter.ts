const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

export function extensionForCheckImageMime(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  const ext = MIME_EXTENSIONS[normalized];
  if (!ext) {
    throw new Error(`Unsupported check image mime type: ${normalized}`);
  }
  return ext;
}

/** Tenant-scoped storage path: `{tenantId}/checks/{checkId}/scan.{ext}` */
export function buildCheckImageStorageKey(
  tenantId: string,
  checkId: string,
  mimeType: string,
): string {
  const ext = extensionForCheckImageMime(mimeType);
  return `${tenantId}/checks/${checkId}/scan.${ext}`;
}
