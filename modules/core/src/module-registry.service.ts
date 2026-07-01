import { Injectable, type INestApplication, type OnModuleInit } from '@nestjs/common';

import { coreHivorkModule } from './core.module.js';
import type { HivorkModule, PermissionDefinition } from './interfaces/hivork-module.interface.js';

@Injectable()
export class ModuleRegistryService implements OnModuleInit {
  private readonly modules = new Map<string, HivorkModule>();

  onModuleInit(): void {
    this.register(coreHivorkModule);
  }

  register(mod: HivorkModule): void {
    this.modules.set(mod.code, mod);
  }

  get(code: string): HivorkModule | undefined {
    return this.modules.get(code);
  }

  getAllPermissions(): PermissionDefinition[] {
    return [...this.modules.values()].flatMap((mod) => mod.permissions);
  }

  bootstrap(app: INestApplication): void {
    for (const mod of this.modules.values()) {
      mod.register(app);
    }
  }
}
