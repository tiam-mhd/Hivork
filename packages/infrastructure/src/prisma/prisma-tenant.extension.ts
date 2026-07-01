import { Prisma } from '@prisma/client';

import { getDataScopeFilter, getTenantId } from '../context/request-context.js';
import {
  TENANT_SCOPED_MODELS,
  applyDataScopeToWhere,
  mergeWhere,
} from './prisma-extension.config.js';

const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_FILTER_OPERATIONS = new Set(['updateMany', 'deleteMany']);

const UNIQUE_WRITE_OPERATIONS = new Set(['update', 'delete', 'upsert']);

export const tenantExtension = Prisma.defineExtension({
  name: 'hivork-tenant',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_SCOPED_MODELS.includes(model as (typeof TENANT_SCOPED_MODELS)[number])) {
          return query(args);
        }

        const tenantId = getTenantId();
        const dataScopeFilter = getDataScopeFilter();
        if (!tenantId && Object.keys(dataScopeFilter).length === 0) {
          return query(args);
        }

        const nextArgs = { ...args } as Record<string, unknown>;

        if (operation === 'create' || operation === 'createMany') {
          if (tenantId) {
            if (operation === 'create') {
              nextArgs.data = {
                ...(nextArgs.data as Record<string, unknown>),
                tenantId,
              };
            } else {
              const data = nextArgs.data as Array<Record<string, unknown>> | Record<string, unknown>;
              if (Array.isArray(data)) {
                nextArgs.data = data.map((row) => ({ ...row, tenantId }));
              } else {
                nextArgs.data = { ...data, tenantId };
              }
            }
          }
          return query(nextArgs);
        }

        if (UNIQUE_WRITE_OPERATIONS.has(operation)) {
          return query(args);
        }

        if (READ_OPERATIONS.has(operation) || WRITE_FILTER_OPERATIONS.has(operation)) {
          let where = nextArgs.where as Record<string, unknown> | undefined;

          if (tenantId) {
            where = mergeWhere(where, { tenantId });
          }

          where = applyDataScopeToWhere(model, where, dataScopeFilter);
          nextArgs.where = where;
          return query(nextArgs);
        }

        return query(args);
      },
    },
  },
});
