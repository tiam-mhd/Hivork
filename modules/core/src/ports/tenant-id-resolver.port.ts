import type { ExecutionContext } from '@nestjs/common';

export const TENANT_ID_RESOLVER = Symbol('TENANT_ID_RESOLVER');

export interface TenantIdResolver {
  resolveTenantId(context: ExecutionContext): string | null;
}
