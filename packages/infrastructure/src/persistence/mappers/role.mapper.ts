import type { Role } from '@prisma/client';

import type { RoleRecord } from '@hivork/application';

type RoleWithPermissions = Role & {
  rolePermissions: {
    permission: {
      code: string;
      deletedAt: Date | null;
    };
  }[];
};

export function roleToRecord(row: RoleWithPermissions): RoleRecord {
  return {
    id: row.id,
    tenantId: row.tenantId ?? '',
    code: row.code,
    name: row.name,
    isSystem: row.isSystem,
    dataScope: row.dataScope,
    permissions: row.rolePermissions
      .filter((rp) => rp.permission.deletedAt === null)
      .map((rp) => rp.permission.code)
      .sort(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
    updatedById: row.updatedById,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: null,
    version: row.version,
  };
}
