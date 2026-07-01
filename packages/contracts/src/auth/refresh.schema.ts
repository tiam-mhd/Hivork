import { z } from 'zod';

export const RefreshSessionSchema = z.object({
  actor: z.enum(['staff', 'customer']),
});

export const RefreshSessionResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
});

export type RefreshSessionDto = z.infer<typeof RefreshSessionSchema>;
export type RefreshSessionResponseDto = z.infer<typeof RefreshSessionResponseSchema>;
