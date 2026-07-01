import { z } from 'zod';

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

export const SetInitialPasswordSchema = z
  .object({
    password: passwordField,
    passwordConfirm: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password confirmation does not match',
        path: ['passwordConfirm'],
      });
    }
  });

export type SetInitialPasswordDto = z.infer<typeof SetInitialPasswordSchema>;

export const SetInitialPasswordResponseSchema = z.object({
  success: z.literal(true),
});

export type SetInitialPasswordResponseDto = z.infer<typeof SetInitialPasswordResponseSchema>;
