import { z } from 'zod';

import { passwordFieldSchema } from './password-fields.schema.js';

function passwordsMatchRefine(
  value: { newPassword: string; newPasswordConfirm: string },
  ctx: z.RefinementCtx,
): void {
  if (value.newPassword !== value.newPasswordConfirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password confirmation does not match',
      path: ['newPasswordConfirm'],
    });
  }
}

export const ChangeStaffPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: passwordFieldSchema,
    newPasswordConfirm: z.string(),
    revokeOthers: z.boolean().optional().default(true),
  })
  .superRefine(passwordsMatchRefine);

export type ChangeStaffPasswordDto = z.infer<typeof ChangeStaffPasswordSchema>;

export const ChangeStaffPasswordResponseSchema = z.object({
  success: z.literal(true),
});

export type ChangeStaffPasswordResponseDto = z.infer<typeof ChangeStaffPasswordResponseSchema>;

export const ChangeRequiredPasswordSchema = z
  .object({
    changePasswordToken: z.string().min(1).optional(),
    currentPassword: z.string().max(128).optional(),
    newPassword: passwordFieldSchema,
    newPasswordConfirm: z.string(),
  })
  .superRefine(passwordsMatchRefine);

export type ChangeRequiredPasswordDto = z.infer<typeof ChangeRequiredPasswordSchema>;

export const ChangeRequiredPasswordResponseSchema = z.object({
  success: z.literal(true),
});

export type ChangeRequiredPasswordResponseDto = z.infer<
  typeof ChangeRequiredPasswordResponseSchema
>;

export const StaffMfaStatusResponseSchema = z.object({
  totpEnabled: z.boolean(),
  otpStepUpEnabled: z.boolean(),
  backupCodesRemaining: z.number().int().min(0),
});

export type StaffMfaStatusResponseDto = z.infer<typeof StaffMfaStatusResponseSchema>;

export const StaffAccountSecurityResponseSchema = z.object({
  mustChangePassword: z.boolean(),
});

export type StaffAccountSecurityResponseDto = z.infer<
  typeof StaffAccountSecurityResponseSchema
>;
