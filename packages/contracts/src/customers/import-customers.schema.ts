import { z } from 'zod';

export const ImportCustomerRowErrorCodeSchema = z.enum([
  'INVALID_PHONE',
  'INVALID_SECONDARY_PHONE',
  'SECONDARY_PHONE_EQUALS_PRIMARY',
  'CUSTOMER_PHONE_DUPLICATE_IN_FILE',
  'CUSTOMER_ALREADY_EXISTS',
  'TENANT_PLAN_LIMIT_EXCEEDED',
  'FIELD_REQUIRED',
  'CATEGORY_NOT_FOUND',
  'CATEGORY_AMBIGUOUS',
  'INVALID_EMAIL',
  'INVALID_EMERGENCY_CONTACT',
]);

export type ImportCustomerRowErrorCodeDto = z.infer<typeof ImportCustomerRowErrorCodeSchema>;

export const ImportCustomerErrorSchema = z.object({
  row: z.number().int().positive(),
  phone: z.string().nullable(),
  error: ImportCustomerRowErrorCodeSchema,
  message: z.string().optional(),
});

export type ImportCustomerErrorDto = z.infer<typeof ImportCustomerErrorSchema>;

export const ImportCustomersResultSchema = z.object({
  totalRows: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  /** @deprecated Use `failedCount` */
  errorCount: z.number().int().nonnegative().optional(),
  errors: z.array(ImportCustomerErrorSchema),
  errorFileBase64: z.string().optional(),
});

export type ImportCustomersResultDto = z.infer<typeof ImportCustomersResultSchema>;

export const ImportCustomersQuerySchema = z.object({
  includeErrorFile: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((value) => value === 'true' || value === '1'),
});

export type ImportCustomersQueryDto = z.infer<typeof ImportCustomersQuerySchema>;
