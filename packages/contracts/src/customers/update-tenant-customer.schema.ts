import { z } from 'zod';

import { dateOnlySchema } from '../common/money.schema.js';

const PreferredContactChannelSchema = z.enum(['telegram', 'bale', 'sms', 'phone']);
const TenantCustomerGenderSchema = z.enum(['male', 'female', 'other', 'unspecified']);

const updateFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.union([z.string().trim().email(), z.null()]).optional(),
  nationalId: z
    .union([
      z
        .string()
        .trim()
        .regex(/^\d{10}$/),
      z.null(),
    ])
    .optional(),
  birthDate: z.union([dateOnlySchema, z.null()]).optional(),
  gender: z.union([TenantCustomerGenderSchema, z.null()]).optional(),
  address: z.union([z.string().trim().max(500), z.null()]).optional(),
  localCode: z.union([z.string().trim().max(50), z.null()]).optional(),
  tags: z.array(z.string().trim().max(30)).max(20).optional(),
  notes: z.union([z.string().trim().max(2000), z.null()]).optional(),
  internalNotes: z.union([z.string().trim().max(2000), z.null()]).optional(),
  defaultBranchId: z.union([z.string().uuid(), z.null()]).optional(),
  preferredContactChannel: z.union([PreferredContactChannelSchema, z.null()]).optional(),
  marketingOptIn: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateTenantCustomerSchema = updateFieldsSchema
  .extend({
    version: z.number().int().positive(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const { version: _version, ...patch } = data;
    if (Object.keys(patch).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided besides version.',
        path: [],
      });
    }
  });

export type UpdateTenantCustomerDto = z.infer<typeof UpdateTenantCustomerSchema>;
