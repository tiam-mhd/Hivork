/** @deprecated Import from customer-address.schema.js — kept for backward compatibility */
export {
  CustomerAddressInputSchema,
  CustomerAddressSchema,
  CustomerAddressLabelSchema,
  type CustomerAddressInputDto,
  type CustomerAddressDto,
  type CustomerAddressLabelDto,
} from './customer-address.schema.js';

/** @deprecated Import from customer-emergency-contact.schema.js */
export {
  CustomerEmergencyContactInputSchema,
  EmergencyContactSchema,
  EmergencyContactRelationSchema,
  type CustomerEmergencyContactInputDto,
  type EmergencyContactDto,
  type EmergencyContactRelationDto,
} from './customer-emergency-contact.schema.js';

/** @deprecated Import from customer-contact-phone.schema.js */
export {
  CustomerContactPhoneInputSchema,
  ContactPhoneSchema,
  CustomerContactPhoneLabelSchema,
  type CustomerContactPhoneInputDto,
  type ContactPhoneDto,
  type CustomerContactPhoneLabelDto,
} from './customer-contact-phone.schema.js';

import { z } from 'zod';

import { TenantCustomerLinkStatusSchema } from './tenant-customer-base.schema.js';
import { CustomerAddressInputSchema } from './customer-address.schema.js';
import { CustomerContactPhoneInputSchema } from './customer-contact-phone.schema.js';
import { CustomerEmergencyContactInputSchema } from './customer-emergency-contact.schema.js';

export const CreateTenantCustomerEnterpriseFieldsSchema = z.object({
  categoryId: z.string().uuid().optional(),
  assignedStaffId: z.string().uuid().optional(),
  status: TenantCustomerLinkStatusSchema.optional(),
  addresses: z.array(CustomerAddressInputSchema).max(10).optional(),
  emergencyContacts: z.array(CustomerEmergencyContactInputSchema).max(5).optional(),
  contactPhones: z.array(CustomerContactPhoneInputSchema).max(5).optional(),
  isBlacklisted: z.boolean().optional(),
  blacklistReason: z.string().trim().max(500).optional(),
});

export type CreateTenantCustomerEnterpriseFieldsDto = z.infer<
  typeof CreateTenantCustomerEnterpriseFieldsSchema
>;
