import { z } from 'zod';

const IRAN_MOBILE_PATTERN = /^09\d{9}$/;

export function normalizePhone(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('98')) d = `0${d.slice(2)}`;
  else if (d.length === 10 && d.startsWith('9')) d = `0${d}`;
  if (!IRAN_MOBILE_PATTERN.test(d)) throw new Error('INVALID_PHONE');
  return d;
}

export const phoneSchema = z.string().transform((input, ctx) => {
  try {
    return normalizePhone(input);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد',
    });
    return z.NEVER;
  }
});
