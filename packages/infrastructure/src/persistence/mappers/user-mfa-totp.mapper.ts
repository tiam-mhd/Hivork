import { Prisma } from '@prisma/client';
import { type BackupCodeEntry, UserMfaTotp } from '@hivork/domain';

type UserMfaTotpRow = {
  id: string;
  userId: string;
  secretEncrypted: string;
  enabledAt: Date | null;
  lastUsedAt: Date | null;
  backupCodesHash: unknown;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
};

function parseBackupCodes(value: unknown): BackupCodeEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const entries: BackupCodeEntry[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (typeof record.hash !== 'string') {
      continue;
    }
    entries.push({
      hash: record.hash,
      usedAt: typeof record.usedAt === 'string' ? record.usedAt : null,
    });
  }

  return entries.length > 0 ? entries : null;
}

function toJsonBackupCodes(
  value: BackupCodeEntry[] | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value;
}

export function userMfaTotpToDomain(row: UserMfaTotpRow): UserMfaTotp {
  return UserMfaTotp.reconstitute({
    id: row.id,
    userId: row.userId,
    secretEncrypted: row.secretEncrypted,
    enabledAt: row.enabledAt,
    lastUsedAt: row.lastUsedAt,
    backupCodesHash: parseBackupCodes(row.backupCodesHash),
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
    version: row.version,
  });
}

export function userMfaTotpToCreateData(
  record: UserMfaTotp,
  createdById?: string,
): {
  id: string;
  userId: string;
  secretEncrypted: string;
  enabledAt: Date | null;
  lastUsedAt: Date | null;
  backupCodesHash: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  createdById: string | null;
  version: number;
} {
  const props = record.toPersistence();
  return {
    id: props.id,
    userId: props.userId,
    secretEncrypted: props.secretEncrypted,
    enabledAt: props.enabledAt,
    lastUsedAt: props.lastUsedAt,
    backupCodesHash: toJsonBackupCodes(props.backupCodesHash),
    createdById: createdById ?? null,
    version: props.version,
  };
}

export function userMfaTotpToUpdateData(
  record: UserMfaTotp,
  updatedById?: string,
): {
  secretEncrypted: string;
  enabledAt: Date | null;
  lastUsedAt: Date | null;
  backupCodesHash: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  updatedById: string | null;
  version: number;
} {
  const props = record.toPersistence();
  return {
    secretEncrypted: props.secretEncrypted,
    enabledAt: props.enabledAt,
    lastUsedAt: props.lastUsedAt,
    backupCodesHash: toJsonBackupCodes(props.backupCodesHash),
    deletedAt: props.deletedAt,
    deletedById: props.deletedById,
    deleteReason: props.deleteReason,
    updatedById: updatedById ?? null,
    version: props.version,
  };
}
