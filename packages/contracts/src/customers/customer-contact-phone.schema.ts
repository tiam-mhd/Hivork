import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';
import { customerValidationMessages } from './customer-validation-messages.js';

export const CustomerContactPhoneLabelSchema = z.enum(['mobile', 'home', 'work', 'other']);

export type CustomerContactPhoneLabelDto = z.infer<typeof CustomerContactPhoneLabelSchema>;

export const CustomerContactPhoneInputSchema = z.object({
  phone: phoneSchema,
  label: CustomerContactPhoneLabelSchema.optional(),
  isWhatsApp: z.boolean().optional(),
  isPrimarySecondary: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CustomerContactPhoneInputDto = z.infer<typeof CustomerContactPhoneInputSchema>;

/** Response / detail shape */
export const ContactPhoneSchema = CustomerContactPhoneInputSchema.extend({
  id: z.string().uuid(customerValidationMessages.uuid),
  isVerified: z.boolean().optional(),
});

export type ContactPhoneDto = z.infer<typeof ContactPhoneSchema>;
