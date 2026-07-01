import { ModuleRegistryService } from '@hivork/module-core';
import { describe, expect, it, vi } from 'vitest';

import { InstallmentsModule, installmentsModuleDef } from './installments.module.js';
import { INSTALLMENTS_PERMISSION_CODES } from './installments.permissions.js';

describe('InstallmentsModule', () => {
  it('registers installments module in ModuleRegistryService on init', () => {
    const moduleRegistry = {
      register: vi.fn(),
    };
    const module = new InstallmentsModule(moduleRegistry as never);

    module.onModuleInit();

    expect(moduleRegistry.register).toHaveBeenCalledWith(installmentsModuleDef);
  });

  it('exposes production module metadata', () => {
    expect(installmentsModuleDef.code).toBe('installments');
    expect(installmentsModuleDef.version).toBe('1.0.0');
    expect(installmentsModuleDef.permissions).toHaveLength(INSTALLMENTS_PERMISSION_CODES.length);
  });
});
