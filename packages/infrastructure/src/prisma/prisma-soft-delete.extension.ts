import { Prisma } from '@prisma/client';

import { getTenantId, isBypassSoftDelete } from '../context/request-context.js';
import { HardDeleteForbiddenError } from './errors/hard-delete-forbidden.error.js';
import { InstallmentCannotDeleteError } from './errors/installment-cannot-delete.error.js';
import {
  NO_DELETE_MODELS,
  SOFT_DELETE_MODELS,
  TENANT_SCOPED_MODELS,
  mergeWhere,
} from './prisma-extension.config.js';

const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const NO_DELETE_WRITE_OPERATIONS = new Set(['update', 'updateMany', 'upsert']);

const WRITE_FILTER_OPERATIONS = new Set(['updateMany']);

const DELETE_OPERATIONS = new Set(['delete', 'deleteMany']);

const UNIQUE_READ_OPERATIONS = new Set(['findUnique', 'findUniqueOrThrow']);

type SoftDeleteRow = {
  deletedAt?: Date | null;
  tenantId?: string | null;
};

function isSoftDeleted(row: SoftDeleteRow | null | undefined): boolean {
  return row?.deletedAt != null;
}

function isCrossTenant(row: SoftDeleteRow | null | undefined, tenantId: string): boolean {
  return row?.tenantId != null && row.tenantId !== tenantId;
}

function hasSoftDeleteFields(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  return 'deletedAt' in data || 'deletedById' in data || 'deleteReason' in data;
}

export const softDeleteExtension = Prisma.defineExtension({
  name: 'hivork-soft-delete',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (NO_DELETE_MODELS.includes(model as (typeof NO_DELETE_MODELS)[number])) {
          if (DELETE_OPERATIONS.has(operation)) {
            throw new InstallmentCannotDeleteError(model);
          }

          if (NO_DELETE_WRITE_OPERATIONS.has(operation)) {
            const nextArgs = args as { data?: unknown };
            if (hasSoftDeleteFields(nextArgs.data)) {
              throw new InstallmentCannotDeleteError(model);
            }
          }
        }

        if (!SOFT_DELETE_MODELS.includes(model as (typeof SOFT_DELETE_MODELS)[number])) {
          return query(args);
        }

        if (DELETE_OPERATIONS.has(operation)) {
          throw new HardDeleteForbiddenError(model);
        }

        if (UNIQUE_READ_OPERATIONS.has(operation)) {
          const result = (await query(args)) as SoftDeleteRow | null;
          if (isBypassSoftDelete() || !isSoftDeleted(result)) {
            return result;
          }

          if (operation === 'findUniqueOrThrow') {
            throw new Prisma.PrismaClientKnownRequestError('Record not found', {
              code: 'P2025',
              clientVersion: '6.19.3',
            });
          }

          return null;
        }

        if (isBypassSoftDelete()) {
          return query(args);
        }

        if (READ_OPERATIONS.has(operation)) {
          const nextArgs = { ...args } as Record<string, unknown>;
          nextArgs.where = mergeWhere(nextArgs.where as Record<string, unknown> | undefined, {
            deletedAt: null,
          });
          return query(nextArgs);
        }

        if (operation === 'upsert' || operation === 'update') {
          // Unique selector in `where` must not be wrapped — Prisma rejects non-unique filters.
          return query(args);
        }

        if (WRITE_FILTER_OPERATIONS.has(operation)) {
          const nextArgs = { ...args } as Record<string, unknown>;
          nextArgs.where = mergeWhere(nextArgs.where as Record<string, unknown> | undefined, {
            deletedAt: null,
          });
          return query(nextArgs);
        }

        return query(args);
      },
    },
  },
});

export const tenantUniqueReadExtension = Prisma.defineExtension({
  name: 'hivork-tenant-unique-read',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!UNIQUE_READ_OPERATIONS.has(operation)) {
          return query(args);
        }

        if (!TENANT_SCOPED_MODELS.includes(model as (typeof TENANT_SCOPED_MODELS)[number])) {
          return query(args);
        }

        const tenantId = getTenantId();
        if (!tenantId) {
          return query(args);
        }

        const result = (await query(args)) as SoftDeleteRow | null;
        if (!result || isCrossTenant(result, tenantId)) {
          if (operation === 'findUniqueOrThrow') {
            throw new Prisma.PrismaClientKnownRequestError('Record not found', {
              code: 'P2025',
              clientVersion: '6.19.3',
            });
          }
          return null;
        }

        return result;
      },
    },
  },
});
