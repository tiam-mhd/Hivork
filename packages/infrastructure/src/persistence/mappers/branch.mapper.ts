import type { Branch } from '@prisma/client';

import type { BranchRecord } from '@hivork/application';

export function branchToRecord(row: Branch): BranchRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    address: row.address,
    phone: row.phone,
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
    updatedById: row.updatedById,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
    version: row.version,
    metadata: toMetadataRecord(row.metadata),
  };
}

function toMetadataRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
