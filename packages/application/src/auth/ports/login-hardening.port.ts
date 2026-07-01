export type LoginHardeningContext = {
  captchaToken?: string;
  clientIp?: string;
  tenantId?: string;
  captchaBypassToken?: string;
  ipAllowlistBypassToken?: string;
  ipAllowlistAuditMetadata?: Record<string, unknown>;
};

/** Captcha + IP allowlist hooks (IFP-012 / IFP-014). */
export interface ILoginHardeningPort {
  assertLoginAllowed(context: LoginHardeningContext): Promise<void>;
  recordPasswordLoginFailure(clientIp: string | undefined): Promise<void>;
}
