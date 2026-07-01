import { DomainError } from '../../errors/domain.error.js';

const PHONE_PATTERN = /^09\d{9}$/;

export function normalizePhone(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('98')) d = `0${d.slice(2)}`;
  else if (d.length === 10 && d.startsWith('9')) d = `0${d}`;
  if (!PHONE_PATTERN.test(d)) {
    throw new DomainError('INVALID_PHONE');
  }
  return d;
}

export function validatePhone(phone: string): void {
  if (!PHONE_PATTERN.test(phone)) {
    throw new DomainError('INVALID_PHONE');
  }
}
