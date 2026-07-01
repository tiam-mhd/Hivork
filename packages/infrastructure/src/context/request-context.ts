import { AsyncLocalStorage } from 'node:async_hooks';

import type { DataScopeFilter } from '@hivork/application';

export type PrismaRequestContext = {
  tenantId: string;
  staffId: string;
  activeBranchId: string | null;
  primaryBranchId: string | null;
  effectiveBranchIds: string[];
  dataScopeFilter?: DataScopeFilter;
  bypassSoftDelete?: boolean;
  bypassStaffSessionActive?: boolean;
};

export const prismaRequestStorage = new AsyncLocalStorage<PrismaRequestContext>();

export function getRequestContext(): PrismaRequestContext | undefined {
  return prismaRequestStorage.getStore();
}

export function getTenantId(): string | undefined {
  return prismaRequestStorage.getStore()?.tenantId;
}

export function getDataScopeFilter(): DataScopeFilter {
  return prismaRequestStorage.getStore()?.dataScopeFilter ?? {};
}

export function isBypassSoftDelete(): boolean {
  return prismaRequestStorage.getStore()?.bypassSoftDelete === true;
}

export function runWithBypassSoftDelete<T>(fn: () => T): T {
  const current = prismaRequestStorage.getStore();
  if (!current) {
    return fn();
  }

  return prismaRequestStorage.run({ ...current, bypassSoftDelete: true }, fn);
}

export function isBypassStaffSessionActive(): boolean {
  return prismaRequestStorage.getStore()?.bypassStaffSessionActive === true;
}

export function runWithBypassStaffSessionActive<T>(fn: () => T): T {
  const current = prismaRequestStorage.getStore();
  if (!current) {
    return fn();
  }

  return prismaRequestStorage.run({ ...current, bypassStaffSessionActive: true }, fn);
}
