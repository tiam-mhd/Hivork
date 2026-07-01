export type IpAllowlistAssertInput = {
  tenantId: string;
  clientIp?: string;
  bypassToken?: string;
  auditMetadata?: Record<string, unknown>;
};

/** Tenant IP allowlist enforcement for staff login (IFP-014). */
export interface IIpAllowlistPort {
  assertStaffLoginAllowed(input: IpAllowlistAssertInput): Promise<void>;
}
