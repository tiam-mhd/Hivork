import { z } from 'zod';

import { phoneSchema } from '../common/phone.schema.js';

export const GuarantorRelationshipSchema = z.enum([
  'parent',
  'spouse',
  'sibling',
  'employer',
  'other',
]);

export type GuarantorRelationshipDto = z.infer<typeof GuarantorRelationshipSchema>;

export const GuarantorSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  tenantCustomerId: z.string().uuid().nullable(),
  fullName: z.string().nullable(),
  nationalId: z.string().nullable(),
  phone: z.string().nullable(),
  relationship: GuarantorRelationshipSchema,
  note: z.string().nullable(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdById: z.string().uuid().nullable(),
  version: z.number().int().positive(),
});

export type GuarantorDto = z.infer<typeof GuarantorSchema>;

export const CreateGuarantorSchema = z
  .object({
    tenantCustomerId: z.string().uuid().optional(),
    fullName: z.string().trim().min(2).max(200).optional(),
    nationalId: z
      .string()
      .regex(/^\d{10}$/, 'INVALID_NATIONAL_ID')
      .optional(),
    phone: phoneSchema.optional(),
    relationship: GuarantorRelationshipSchema,
    note: z.string().trim().max(2000).optional(),
    sortOrder: z.number().int().nonnegative().max(9999).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.tenantCustomerId && !(value.fullName && value.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GUARANTOR_IDENTITY_REQUIRED',
        path: ['tenantCustomerId'],
      });
    }
  });

export type CreateGuarantorDto = z.infer<typeof CreateGuarantorSchema>;

export const UpdateGuarantorSchema = z
  .object({
    tenantCustomerId: z.union([z.string().uuid(), z.null()]).optional(),
    fullName: z.string().trim().min(2).max(200).nullable().optional(),
    nationalId: z
      .union([z.string().regex(/^\d{10}$/, 'INVALID_NATIONAL_ID'), z.null()])
      .optional(),
    phone: phoneSchema.nullable().optional(),
    relationship: GuarantorRelationshipSchema.optional(),
    note: z.union([z.string().trim().max(2000), z.null()]).optional(),
    sortOrder: z.number().int().nonnegative().max(9999).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'VALIDATION_ERROR',
  });

export type UpdateGuarantorDto = z.infer<typeof UpdateGuarantorSchema>;

export const GuarantorListResponseSchema = z.object({
  data: z.array(GuarantorSchema),
});

export type GuarantorListResponseDto = z.infer<typeof GuarantorListResponseSchema>;

export const DeleteGuarantorBodySchema = z.object({
  deleteReason: z.string().trim().min(3).max(500).optional(),
});

export type DeleteGuarantorBodyDto = z.infer<typeof DeleteGuarantorBodySchema>;
