import { Prisma } from '@prisma/client';

import { mergeWhere } from './prisma-extension.config.js';
import { isBypassStaffSessionActive } from '../context/request-context.js';

const STAFF_SESSION_MODEL = 'StaffSession' as const;

const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_FILTER_OPERATIONS = new Set(['updateMany']);

/** Active session reads exclude revoked rows (IFP-008). */
export const staffSessionActiveExtension = Prisma.defineExtension({
  name: 'hivork-staff-session-active',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (model !== STAFF_SESSION_MODEL) {
          return query(args);
        }

        if (isBypassStaffSessionActive()) {
          return query(args);
        }

        if (READ_OPERATIONS.has(operation)) {
          const nextArgs = { ...args } as Record<string, unknown>;
          nextArgs.where = mergeWhere(nextArgs.where as Record<string, unknown> | undefined, {
            revokedAt: null,
          });
          return query(nextArgs);
        }

        if (WRITE_FILTER_OPERATIONS.has(operation)) {
          const nextArgs = { ...args } as Record<string, unknown>;
          nextArgs.where = mergeWhere(nextArgs.where as Record<string, unknown> | undefined, {
            revokedAt: null,
          });
          return query(nextArgs);
        }

        return query(args);
      },
    },
  },
});
