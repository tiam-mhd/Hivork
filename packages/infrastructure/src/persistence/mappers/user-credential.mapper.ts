import { CredentialStatus, UserCredential, type UserCredentialMetadata } from '@hivork/domain';
import { Prisma } from '@prisma/client';

type UserCredentialRow = {
  id: string;
  userId: string;
  passwordHash: string;
  passwordChangedAt: Date | null;
  mustChangePassword: boolean;
  status: CredentialStatus;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastFailedLoginAt: Date | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
  metadata: unknown;
};

function parseMetadata(value: unknown): UserCredentialMetadata | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const passwordHistory = Array.isArray(record.passwordHistory)
    ? record.passwordHistory.filter((item): item is string => typeof item === 'string')
    : undefined;

  if (!passwordHistory || passwordHistory.length === 0) {
    return null;
  }

  return { passwordHistory };
}

function metadataToJson(
  metadata: UserCredentialMetadata | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!metadata) {
    return Prisma.JsonNull;
  }
  return metadata;
}

export function userCredentialToDomain(row: UserCredentialRow): UserCredential {
  return UserCredential.reconstitute({
    id: row.id,
    userId: row.userId,
    passwordHash: row.passwordHash,
    passwordChangedAt: row.passwordChangedAt,
    mustChangePassword: row.mustChangePassword,
    status: row.status,
    failedLoginCount: row.failedLoginCount,
    lockedUntil: row.lockedUntil,
    lastFailedLoginAt: row.lastFailedLoginAt,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
    version: row.version,
    metadata: parseMetadata(row.metadata),
  });
}

export function userCredentialToCreateData(
  credential: UserCredential,
  createdById?: string,
): {
  id: string;
  userId: string;
  passwordHash: string;
  passwordChangedAt: Date | null;
  mustChangePassword: boolean;
  status: CredentialStatus;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastFailedLoginAt: Date | null;
  createdById: string | null;
  version: number;
  metadata: Prisma.InputJsonValue | typeof Prisma.JsonNull;
} {
  const props = credential.toPersistence();
  return {
    id: props.id,
    userId: props.userId,
    passwordHash: props.passwordHash,
    passwordChangedAt: props.passwordChangedAt,
    mustChangePassword: props.mustChangePassword,
    status: props.status,
    failedLoginCount: props.failedLoginCount,
    lockedUntil: props.lockedUntil,
    lastFailedLoginAt: props.lastFailedLoginAt,
    createdById: createdById ?? null,
    version: props.version,
    metadata: metadataToJson(props.metadata),
  };
}

export function userCredentialToUpdateData(credential: UserCredential): {
  passwordHash: string;
  passwordChangedAt: Date | null;
  mustChangePassword: boolean;
  status: CredentialStatus;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastFailedLoginAt: Date | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
  metadata: Prisma.InputJsonValue | typeof Prisma.JsonNull;
} {
  const props = credential.toPersistence();
  return {
    passwordHash: props.passwordHash,
    passwordChangedAt: props.passwordChangedAt,
    mustChangePassword: props.mustChangePassword,
    status: props.status,
    failedLoginCount: props.failedLoginCount,
    lockedUntil: props.lockedUntil,
    lastFailedLoginAt: props.lastFailedLoginAt,
    deletedAt: props.deletedAt,
    deletedById: props.deletedById,
    deleteReason: props.deleteReason,
    version: props.version,
    metadata: metadataToJson(props.metadata),
  };
}
