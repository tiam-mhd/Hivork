import { z } from 'zod';

import { dateOnlySchema } from '../common/money.schema.js';
import { phoneSchema } from '../common/phone.schema.js';
import { CustomerAddressInputSchema } from './customer-address.schema.js';
import { CustomerContactPhoneInputSchema } from './customer-contact-phone.schema.js';
import { CustomerEmergencyContactInputSchema } from './customer-emergency-contact.schema.js';
import {
  refineBlacklistFields,
  refineContactPhones,
  refineSinglePrimaryAddress,
  refineSinglePrimaryEmergencyContact,
} from './customer-nested-refinements.js';
import { customerValidationMessages } from './customer-validation-messages.js';
import {
  PreferredContactChannelSchema,
  TenantCustomerGenderSchema,
  TenantCustomerLinkStatusSchema,
} from './tenant-customer-base.schema.js';

export const CreateTenantCustomerSchema = z
  .object({
    phone: phoneSchema,
    name: z.string().trim().min(2, customerValidationMessages.nameMin).max(200, customerValidationMessages.nameMax).optional(),
    email: z.string().trim().email(customerValidationMessages.email).optional(),
    nationalId: z
      .string()
      .trim()
      .regex(/^\d{10}$/, customerValidationMessages.nationalId)
      .optional(),
    birthDate: dateOnlySchema.optional(),
    gender: TenantCustomerGenderSchema.optional(),
    address: z.string().trim().max(500).optional(),
    localCode: z.string().trim().max(50).optional(),
    tags: z.array(z.string().trim().max(30, customerValidationMessages.tagMax)).max(20, customerValidationMessages.tagsMax).optional(),
    notes: z.string().trim().max(2000).optional(),
    internalNotes: z.string().trim().max(2000).optional(),
    defaultBranchId: z.string().uuid(customerValidationMessages.uuid).optional(),
    preferredContactChannel: PreferredContactChannelSchema.optional(),
    marketingOptIn: z.boolean().optional(),
    categoryId: z.string().uuid(customerValidationMessages.uuid).optional(),
    assignedStaffId: z.string().uuid(customerValidationMessages.uuid).optional(),
    status: TenantCustomerLinkStatusSchema.optional(),
    addresses: z.array(CustomerAddressInputSchema).max(10, customerValidationMessages.addressesMax).optional(),
    emergencyContacts: z
      .array(CustomerEmergencyContactInputSchema)
      .max(5, customerValidationMessages.emergencyContactsMax)
      .optional(),
    contactPhones: z
      .array(CustomerContactPhoneInputSchema)
      .max(5, customerValidationMessages.contactPhonesMax)
      .optional(),
    isBlacklisted: z.boolean().optional(),
    blacklistReason: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    refineBlacklistFields(data, ctx);
    refineSinglePrimaryAddress(data, ctx);
    refineSinglePrimaryEmergencyContact(data, ctx);
    refineContactPhones(data, ctx);
  });

export type CreateTenantCustomerDto = z.infer<typeof CreateTenantCustomerSchema>;
