import type { DataScopeFilter } from '@hivork/application';
import { prismaRequestStorage } from '@hivork/infrastructure';

export const dataScopeStorage = prismaRequestStorage;

export function getDataScopeFilter(): DataScopeFilter | undefined {
  return prismaRequestStorage.getStore()?.dataScopeFilter;
}
