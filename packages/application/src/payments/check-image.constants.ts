export const CHECK_IMAGE_MAX_BYTES = 5n * 1024n * 1024n;

export const ALLOWED_CHECK_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export type AllowedCheckImageMime = (typeof ALLOWED_CHECK_IMAGE_MIMES)[number];

export function buildCheckImageStorageKey(
  tenantId: string,
  checkId: string,
  mimeType: string,
): string {
  const normalized = mimeType.trim().toLowerCase();
  let ext: string;
  switch (normalized) {
    case 'image/jpeg':
      ext = 'jpg';
      break;
    case 'image/png':
      ext = 'png';
      break;
    case 'application/pdf':
      ext = 'pdf';
      break;
    default:
      throw new Error(`Unsupported check image mime type: ${normalized}`);
  }
  return `${tenantId}/checks/${checkId}/scan.${ext}`;
}
