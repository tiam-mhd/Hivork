export const CUSTOMER_DOCUMENT_ACCEPT = 'image/jpeg,image/png,application/pdf';

export const CUSTOMER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

export function validateCustomerDocumentFile(file: File): { ok: true } | { ok: false; message: string } {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      message: 'فقط فایل‌های JPEG، PNG و PDF مجاز هستند.',
    };
  }

  if (file.size > CUSTOMER_DOCUMENT_MAX_BYTES) {
    return {
      ok: false,
      message: 'حجم فایل بیش از ۱۰ مگابایت است.',
    };
  }

  return { ok: true };
}
