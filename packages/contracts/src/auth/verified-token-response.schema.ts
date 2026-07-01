import { z } from 'zod';

export const VerifiedTokenResponseSchema = z.object({
  verifiedToken: z.string(),
  expiresIn: z.number().int().positive(),
});

export type VerifiedTokenResponseDto = z.infer<typeof VerifiedTokenResponseSchema>;
