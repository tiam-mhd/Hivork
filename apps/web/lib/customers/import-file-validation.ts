export const CUSTOMER_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const CUSTOMER_IMPORT_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type ImportFileValidationCode = 'invalid_type' | 'too_large' | 'empty';

export type ImportFileValidationResult =
  | { ok: true }
  | { ok: false; code: ImportFileValidationCode; message: string };

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function validateCustomerImportFile(file: File): ImportFileValidationResult {
  if (file.size === 0) {
    return { ok: false, code: 'empty', message: 'فایل خالی است.' };
  }

  if (file.size > CUSTOMER_IMPORT_MAX_BYTES) {
    return { ok: false, code: 'too_large', message: 'حجم فایل بیش از ۵ مگابایت است.' };
  }

  const name = file.name.toLowerCase();
  const isXlsx = name.endsWith('.xlsx') || file.type === XLSX_MIME;
  if (!isXlsx) {
    return { ok: false, code: 'invalid_type', message: 'فقط فایل Excel (.xlsx) مجاز است.' };
  }

  return { ok: true };
}
