import { z } from 'zod';

export const ImportCustomerRowErrorCodeSchema = z.enum([
  'INVALID_PHONE',
  'CUSTOMER_PHONE_DUPLICATE_IN_FILE',
  'CUSTOMER_ALREADY_EXISTS',
  'TENANT_PLAN_LIMIT_EXCEEDED',
  'FIELD_REQUIRED',
]);

export type ImportCustomerRowErrorCodeDto = z.infer<typeof ImportCustomerRowErrorCodeSchema>;

export const ImportCustomerErrorSchema = z.object({
  row: z.number().int().positive(),
  phone: z.string().nullable(),
  error: ImportCustomerRowErrorCodeSchema,
});

export type ImportCustomerErrorDto = z.infer<typeof ImportCustomerErrorSchema>;

export const ImportCustomersResultSchema = z.object({
  totalRows: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  errors: z.array(ImportCustomerErrorSchema),
});

export type ImportCustomersResultDto = z.infer<typeof ImportCustomersResultSchema>;
