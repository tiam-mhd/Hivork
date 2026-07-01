import type { Request } from 'express';

export const IP_ALLOWLIST_BYPASS_HEADER = 'x-ip-allowlist-bypass';

export function readIpAllowlistBypassToken(req: Request): string | undefined {
  const header = req.headers[IP_ALLOWLIST_BYPASS_HEADER];
  return typeof header === 'string' && header.length > 0 ? header : undefined;
}
