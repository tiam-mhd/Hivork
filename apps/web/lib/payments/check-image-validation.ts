import { CHECK_IMAGE_ABSOLUTE_MAX_BYTES } from '@hivork/contracts/payments';

export const CHECK_IMAGE_ACCEPT = 'image/jpeg,image/png,application/pdf';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'application/pdf']);

export function validateCheckImageFile(file: File): { ok: true } | { ok: false; message: string } {
  if (!ALLOWED.has(file.type)) {
    return { ok: false, message: 'فقط فایل JPEG، PNG یا PDF مجاز است.' };
  }
  if (file.size > CHECK_IMAGE_ABSOLUTE_MAX_BYTES) {
    return { ok: false, message: 'حجم فایل نباید بیشتر از ۵ مگابایت باشد.' };
  }
  return { ok: true };
}
