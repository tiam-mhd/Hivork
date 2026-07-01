import { z } from 'zod';

const RIAL_DIGITS_PATTERN = /^\d+$/;

export const bigintRialStringSchema = z
  .string()
  .regex(RIAL_DIGITS_PATTERN, 'AMOUNT_INVALID')
  .refine((value) => BigInt(value) > 0n, { message: 'AMOUNT_INVALID' });

export const bigintRialNonNegativeSchema = z
  .string()
  .regex(RIAL_DIGITS_PATTERN, 'AMOUNT_INVALID')
  .refine((value) => BigInt(value) >= 0n, { message: 'AMOUNT_INVALID' });

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'INVALID_DATE_FORMAT');

/** Parse validated rial string to bigint — use after schema parse on server. */
export function parseBigIntRial(value: string): bigint {
  return BigInt(value);
}

export const bigintRialPositiveTransformSchema = bigintRialStringSchema.transform(parseBigIntRial);

export const bigintRialNonNegativeTransformSchema = bigintRialNonNegativeSchema.transform(parseBigIntRial);
