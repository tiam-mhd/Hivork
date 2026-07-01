import { Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

import { CORE_PERMISSIONS } from './core.permissions.js';
import type { HivorkModule } from './interfaces/hivork-module.interface.js';
import { ModuleRegistryService } from './module-registry.service.js';

/** NestJS wiring for auth, tenant, RBAC — expanded in Epic-06/07. */
@Module({
  providers: [ModuleRegistryService],
  exports: [ModuleRegistryService],
})
export class CoreModule {}

export const coreHivorkModule: HivorkModule = {
  code: 'core',
  name: 'هسته پلتفرم',
  version: '0.0.0',
  permissions: CORE_PERMISSIONS,
  register(_app: INestApplication): void {
    // TASK-041+ — register core controllers and global providers
  },
};
