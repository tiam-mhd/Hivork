import { z } from 'zod';

export const TotpSetupResponseSchema = z.object({
  secret: z.string().min(1),
  otpauthUrl: z.string().min(1),
  qrCodeDataUrl: z.string().startsWith('data:image/png;base64,'),
  pendingExpiresAt: z.string().datetime(),
});

export type TotpSetupResponseDto = z.infer<typeof TotpSetupResponseSchema>;

export const TotpVerifySetupSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Authenticator code must be 6 digits'),
});

export type TotpVerifySetupDto = z.infer<typeof TotpVerifySetupSchema>;

export const TotpVerifySetupResponseSchema = z.object({
  enabled: z.literal(true),
  backupCodes: z.array(z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)).length(10),
});

export type TotpVerifySetupResponseDto = z.infer<typeof TotpVerifySetupResponseSchema>;

export const TotpDisableSchema = z.object({
  password: z.string().min(1).max(128),
});

export type TotpDisableDto = z.infer<typeof TotpDisableSchema>;

export const TotpDisableResponseSchema = z.object({
  disabled: z.literal(true),
});

export type TotpDisableResponseDto = z.infer<typeof TotpDisableResponseSchema>;

export const TotpRegenerateBackupCodesSchema = z.object({
  password: z.string().min(1).max(128),
});

export type TotpRegenerateBackupCodesDto = z.infer<typeof TotpRegenerateBackupCodesSchema>;

export const TotpRegenerateBackupCodesResponseSchema = z.object({
  backupCodes: z.array(z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)).length(10),
});

export type TotpRegenerateBackupCodesResponseDto = z.infer<
  typeof TotpRegenerateBackupCodesResponseSchema
>;
