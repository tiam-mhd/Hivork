import { AsyncLocalStorage } from 'node:async_hooks';

import type { BranchContext } from './branch.context.js';
import {
  prismaRequestStorage,
  type PrismaRequestContext,
} from '@hivork/infrastructure';

export interface TenantContext {
  tenantId: string;
  staffId: string;
}

export type RequestContext = TenantContext & BranchContext;

/** @deprecated Use prismaRequestStorage from @hivork/infrastructure */
export const tenantStorage = prismaRequestStorage as unknown as AsyncLocalStorage<RequestContext>;

export function getRequestContext(): RequestContext | undefined {
  return prismaRequestStorage.getStore() as RequestContext | undefined;
}

export function runRequestContext<T>(store: PrismaRequestContext, fn: () => T): T {
  return prismaRequestStorage.run(store, fn);
}
