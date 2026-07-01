import { z } from 'zod';

export const LogoutSchema = z.object({
  actor: z.enum(['staff', 'customer']),
});

export const LogoutResponseSchema = z.object({
  success: z.literal(true),
});

export type LogoutDto = z.infer<typeof LogoutSchema>;
export type LogoutResponseDto = z.infer<typeof LogoutResponseSchema>;
