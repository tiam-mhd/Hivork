import { z } from 'zod';

const RIAL_DIGITS_PATTERN = /^\d+$/;
const RIAL_POSITIVE_NO_LEADING_ZERO_PATTERN = /^[1-9][0-9]*$/;

export const bigintRialStringSchema = z
  .string()
  .regex(RIAL_DIGITS_PATTERN, 'AMOUNT_INVALID')
  .refine((value) => BigInt(value) > 0n, { message: 'AMOUNT_INVALID' });

/**
 * Positive rial amount serialized as a decimal string in JSON (ADR-007).
 * Pattern `^[1-9][0-9]*$` — no leading zeros, no decimals, no zero.
 */
export const bigintRialPositiveSchema = z
  .string()
  .regex(RIAL_POSITIVE_NO_LEADING_ZERO_PATTERN, 'AMOUNT_INVALID');

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

export const bigintRialPositiveTransformSchema = bigintRialPositiveSchema.transform(parseBigIntRial);

export const bigintRialNonNegativeTransformSchema = bigintRialNonNegativeSchema.transform(parseBigIntRial);
