import type { UserPermissionOverride } from '@prisma/client';

import type { PermissionOverrideRecord } from '@hivork/application';

type OverrideWithPermission = UserPermissionOverride & {
  permission: { code: string; deletedAt: Date | null };
};

export function overrideToRecord(row: OverrideWithPermission): PermissionOverrideRecord {
  return {
    id: row.id,
    tenantId: '',
    staffId: row.staffId,
    permissionId: row.permissionId,
    permission: row.permission.code,
    effect: row.effect,
    reason: row.reason ?? '',
    expiresAt: row.expiresAt,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    updatedById: row.updatedById,
    deletedAt: row.deletedAt,
    deletedById: null,
    deleteReason: null,
    version: 1,
  };
}
