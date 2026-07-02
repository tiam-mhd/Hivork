import { z } from 'zod';

import { customerValidationMessages } from './customer-validation-messages.js';

export const CustomerAddressLabelSchema = z.enum(['home', 'work', 'billing', 'other']);

export type CustomerAddressLabelDto = z.infer<typeof CustomerAddressLabelSchema>;

export const CustomerAddressInputSchema = z.object({
  label: CustomerAddressLabelSchema.optional(),
  line1: z.string().trim().min(1, customerValidationMessages.line1Required).max(200, customerValidationMessages.line1Max),
  line2: z.string().trim().max(200, customerValidationMessages.line1Max).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{10}$/, customerValidationMessages.postalCode)
    .optional(),
  isPrimary: z.boolean().optional(),
  latitude: z.union([z.number().min(-90).max(90), z.null()]).optional(),
  longitude: z.union([z.number().min(-180).max(180), z.null()]).optional(),
});

export type CustomerAddressInputDto = z.infer<typeof CustomerAddressInputSchema>;

export const CustomerAddressSchema = CustomerAddressInputSchema.extend({
  id: z.string().uuid(customerValidationMessages.uuid),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type CustomerAddressDto = z.infer<typeof CustomerAddressSchema>;
