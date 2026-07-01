import {
  CoreModule,
  ModuleRegistryService,
  type HivorkModule,
} from '@hivork/module-core';
import { Module, OnModuleInit } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

import { INSTALLMENTS_PERMISSIONS } from './installments.permissions.js';

export const INSTALLMENTS_MENU_ITEMS = [
  {
    id: 'installments-dashboard',
    label: 'داشبورد اقساط',
    path: '/admin/installments',
    permission: 'installments.report.dashboard' as const,
  },
] as const;

export const installmentsModuleDef: HivorkModule = {
  code: 'installments',
  name: 'مدیریت اقساط',
  version: '1.0.0',
  permissions: INSTALLMENTS_PERMISSIONS,
  register(_app: INestApplication): void {
    // Epic-06 (TASK-080+) — register installments controllers and providers
  },
};

/** @deprecated Use `installmentsModuleDef` */
export const installmentsHivorkModule = installmentsModuleDef;

@Module({
  imports: [CoreModule],
})
export class InstallmentsModule implements OnModuleInit {
  constructor(private readonly moduleRegistry: ModuleRegistryService) {}

  onModuleInit(): void {
    this.moduleRegistry.register(installmentsModuleDef);
  }
}
