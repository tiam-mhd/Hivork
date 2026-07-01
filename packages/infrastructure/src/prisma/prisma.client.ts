import { PrismaClient } from '@prisma/client';

import { softDeleteExtension, tenantUniqueReadExtension } from './prisma-soft-delete.extension.js';
import { staffSessionActiveExtension } from './staff-session-active.extension.js';
import { tenantExtension } from './prisma-tenant.extension.js';

export function createHivorkPrismaClient(): ReturnType<typeof buildExtendedClient> {
  return buildExtendedClient();
}

function buildExtendedClient() {
  return new PrismaClient()
    .$extends(softDeleteExtension)
    .$extends(staffSessionActiveExtension)
    .$extends(tenantExtension)
    .$extends(tenantUniqueReadExtension);
}

export type HivorkPrismaClient = ReturnType<typeof createHivorkPrismaClient>;
