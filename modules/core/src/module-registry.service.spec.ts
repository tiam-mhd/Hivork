import type { INestApplication } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { CORE_PERMISSION_CODES } from './core.permissions.js';
import { ModuleRegistryService } from './module-registry.service.js';

describe('ModuleRegistryService', () => {
  it('registers core module on init', () => {
    const registry = new ModuleRegistryService();
    registry.onModuleInit();

    expect(registry.get('core')?.code).toBe('core');
    expect(registry.getAllPermissions()).toHaveLength(CORE_PERMISSION_CODES.length);
  });

  it('registers mock module retrievable by code', () => {
    const registry = new ModuleRegistryService();
    registry.register({
      code: 'mock',
      name: 'Mock',
      version: '0.0.0',
      permissions: [
        {
          code: 'mock.resource.view',
          module: 'mock',
          resource: 'resource',
          action: 'view',
        },
      ],
      register: () => undefined,
    });

    expect(registry.get('mock')?.name).toBe('Mock');
    expect(registry.getAllPermissions()).toEqual([
      {
        code: 'mock.resource.view',
        module: 'mock',
        resource: 'resource',
        action: 'view',
      },
    ]);
  });

  it('calls register on each module during bootstrap', () => {
    const registry = new ModuleRegistryService();
    const registerSpy = vi.fn();
    registry.register({
      code: 'mock',
      name: 'Mock',
      version: '0.0.0',
      permissions: [],
      register: registerSpy,
    });

    const app = {} as INestApplication;
    registry.bootstrap(app);

    expect(registerSpy).toHaveBeenCalledWith(app);
  });
});
