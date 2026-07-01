import type { BranchListItem, BranchRecord } from '@hivork/application';

export function toBranchResponse(branch: BranchRecord) {
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    isDefault: branch.isDefault,
    isActive: branch.isActive,
    version: branch.version,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
  };
}

export function toBranchListItemResponse(item: BranchListItem) {
  return {
    id: item.id,
    name: item.name,
    address: item.address,
    phone: item.phone,
    isDefault: item.isDefault,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
  };
}
