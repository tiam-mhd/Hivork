import { z } from 'zod';

import { dateOnlySchema } from '../common/money.schema.js';
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
} from './tenant-customer-base.schema.js';

const UpdateCustomerAddressItemSchema = CustomerAddressInputSchema.extend({
  id: z.string().uuid(customerValidationMessages.uuid).optional(),
});

const UpdateCustomerEmergencyContactItemSchema = CustomerEmergencyContactInputSchema.extend({
  id: z.string().uuid(customerValidationMessages.uuid).optional(),
});

const UpdateCustomerContactPhoneItemSchema = CustomerContactPhoneInputSchema.extend({
  id: z.string().uuid(customerValidationMessages.uuid).optional(),
});

const updateFieldsSchema = z.object({
  name: z.string().trim().min(2, customerValidationMessages.nameMin).max(200, customerValidationMessages.nameMax).optional(),
  email: z.union([z.string().trim().email(customerValidationMessages.email), z.null()]).optional(),
  nationalId: z
    .union([
      z
        .string()
        .trim()
        .regex(/^\d{10}$/, customerValidationMessages.nationalId),
      z.null(),
    ])
    .optional(),
  birthDate: z.union([dateOnlySchema, z.null()]).optional(),
  gender: z.union([TenantCustomerGenderSchema, z.null()]).optional(),
  address: z.union([z.string().trim().max(500), z.null()]).optional(),
  localCode: z.union([z.string().trim().max(50), z.null()]).optional(),
  tags: z.array(z.string().trim().max(30, customerValidationMessages.tagMax)).max(20, customerValidationMessages.tagsMax).optional(),
  notes: z.union([z.string().trim().max(2000), z.null()]).optional(),
  internalNotes: z.union([z.string().trim().max(2000), z.null()]).optional(),
  defaultBranchId: z.union([z.string().uuid(customerValidationMessages.uuid), z.null()]).optional(),
  preferredContactChannel: z.union([PreferredContactChannelSchema, z.null()]).optional(),
  marketingOptIn: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  categoryId: z.union([z.string().uuid(customerValidationMessages.uuid), z.null()]).optional(),
  assignedStaffId: z.union([z.string().uuid(customerValidationMessages.uuid), z.null()]).optional(),
  addresses: z.array(UpdateCustomerAddressItemSchema).max(10, customerValidationMessages.addressesMax).optional(),
  emergencyContacts: z
    .array(UpdateCustomerEmergencyContactItemSchema)
    .max(5, customerValidationMessages.emergencyContactsMax)
    .optional(),
  contactPhones: z
    .array(UpdateCustomerContactPhoneItemSchema)
    .max(5, customerValidationMessages.contactPhonesMax)
    .optional(),
  isBlacklisted: z.boolean().optional(),
  blacklistReason: z.union([z.string().trim().max(500), z.null()]).optional(),
});

export const UpdateTenantCustomerSchema = updateFieldsSchema
  .extend({
    version: z.number().int().positive(customerValidationMessages.versionRequired),
  })
  .strict()
  .superRefine((data, ctx) => {
    const { version: _version, ...patch } = data;
    if (Object.keys(patch).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: customerValidationMessages.patchRequired,
        path: [],
      });
    }
    refineBlacklistFields(data, ctx);
    refineSinglePrimaryAddress(data, ctx);
    refineSinglePrimaryEmergencyContact(data, ctx);
    refineContactPhones(data, ctx);
  });

export type UpdateTenantCustomerDto = z.infer<typeof UpdateTenantCustomerSchema>;
