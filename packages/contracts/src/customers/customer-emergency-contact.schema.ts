import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';
import { customerValidationMessages } from './customer-validation-messages.js';

export const EmergencyContactRelationSchema = z.enum(['parent', 'spouse', 'sibling', 'other']);

export type EmergencyContactRelationDto = z.infer<typeof EmergencyContactRelationSchema>;

export const CustomerEmergencyContactInputSchema = z.object({
  name: z.string().trim().min(1, customerValidationMessages.required).max(120),
  phone: phoneSchema,
  relation: EmergencyContactRelationSchema.optional(),
  isPrimary: z.boolean().optional(),
});

export type CustomerEmergencyContactInputDto = z.infer<typeof CustomerEmergencyContactInputSchema>;

/** Response / detail shape */
export const EmergencyContactSchema = CustomerEmergencyContactInputSchema.extend({
  id: z.string().uuid(customerValidationMessages.uuid),
});

export type EmergencyContactDto = z.infer<typeof EmergencyContactSchema>;
