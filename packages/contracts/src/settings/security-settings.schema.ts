import { z } from 'zod';

/** IPv4 address or CIDR — IPv6 deferred to v2 (IFP-014). */
export const Ipv4OrCidrSchema = z
  .string()
  .trim()
  .regex(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/, 'INVALID_IPV4_CIDR');

export const SecurityIpAllowlistSchema = z.object({
  enabled: z.boolean(),
  cidrs: z.array(Ipv4OrCidrSchema).max(50),
});

export type SecurityIpAllowlistDto = z.infer<typeof SecurityIpAllowlistSchema>;

export const SecuritySettingsSchema = z.object({
  ipAllowlist: SecurityIpAllowlistSchema,
});

export type SecuritySettingsDto = z.infer<typeof SecuritySettingsSchema>;

export const UpdateSecuritySettingsSchema = z
  .object({
    ipAllowlist: SecurityIpAllowlistSchema.partial(),
  })
  .strict()
  .refine((data) => Object.keys(data.ipAllowlist).length > 0, {
    message: 'Patch body must include at least one ipAllowlist field.',
  });

export type UpdateSecuritySettingsDto = z.infer<typeof UpdateSecuritySettingsSchema>;

export const GetSecuritySettingsResponseSchema = z.object({
  data: z.object({
    security: SecuritySettingsSchema,
  }),
});

export type GetSecuritySettingsResponseDto = z.infer<typeof GetSecuritySettingsResponseSchema>;

export const DEFAULT_SECURITY_SETTINGS: SecuritySettingsDto = {
  ipAllowlist: {
    enabled: false,
    cidrs: [],
  },
};
