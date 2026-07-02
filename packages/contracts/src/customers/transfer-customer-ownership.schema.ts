import { z } from 'zod';

import { customerValidationMessages } from './customer-validation-messages.js';
import { TenantCustomerDetailResponseSchema } from './tenant-customer-detail.schema.js';

/** IFP-051 — transfer customer ownership between staff */
export const TransferCustomerOwnershipSchema = z.object({
  newStaffId: z.string().uuid(customerValidationMessages.uuid),
  note: z
    .string()
    .trim()
    .max(500, customerValidationMessages.deleteReasonMax)
    .optional(),
});

export type TransferCustomerOwnershipDto = z.infer<typeof TransferCustomerOwnershipSchema>;

export const TransferCustomerOwnershipResponseSchema = TenantCustomerDetailResponseSchema;

export type TransferCustomerOwnershipResponseDto = z.infer<
  typeof TransferCustomerOwnershipResponseSchema
>;
