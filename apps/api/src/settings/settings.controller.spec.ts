import {
  ApplicationError,
  GetInstallmentSettingsUseCase,
  GetSettingsUseCase,
  UpdateInstallmentSettingsUseCase,
  UpdateSettingUseCase,
} from '@hivork/application';
import { DEFAULT_INSTALLMENTS_SETTINGS } from '@hivork/contracts/installments';
import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsController } from './settings.controller.js';

describe('SettingsController', () => {
  const getSettingsUseCase = { execute: vi.fn() };
  const updateSettingUseCase = { execute: vi.fn() };
  const getInstallmentSettings = { execute: vi.fn() };
  const updateInstallmentSettings = { execute: vi.fn() };
  const moduleEntitlement = { assertModuleEnabled: vi.fn() };

  const controller = new SettingsController(
    getSettingsUseCase as unknown as GetSettingsUseCase,
    updateSettingUseCase as unknown as UpdateSettingUseCase,
    getInstallmentSettings as unknown as GetInstallmentSettingsUseCase,
    updateInstallmentSettings as unknown as UpdateInstallmentSettingsUseCase,
    moduleEntitlement as never,
  );

  const staff = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    primaryBranchId: null,
    activeBranchId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    moduleEntitlement.assertModuleEnabled.mockResolvedValue(undefined);
  });

  it('returns settings for valid core module query', async () => {
    getSettingsUseCase.execute.mockResolvedValue({
      module: 'core',
      settings: { timezone: 'Asia/Tehran', display_currency: 'toman' },
    });

    const result = await controller.getSettings(staff, { module: 'core' });

    expect(result.settings.display_currency).toBe('toman');
    expect(getSettingsUseCase.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      module: 'core',
    });
  });

  it('returns installments settings wrapped in data.installments', async () => {
    getInstallmentSettings.execute.mockResolvedValue({
      installments: DEFAULT_INSTALLMENTS_SETTINGS,
    });

    const result = await controller.getInstallmentsSettingsRoute(staff);

    expect(result).toEqual({
      data: {
        installments: DEFAULT_INSTALLMENTS_SETTINGS,
      },
    });
    expect(moduleEntitlement.assertModuleEnabled).toHaveBeenCalledWith('tenant-1', 'installments');
  });

  it('rejects legacy GET query for installments module', async () => {
    await expect(controller.getSettings(staff, { module: 'installments' })).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
    });
  });

  it('patches installments settings partially', async () => {
    updateInstallmentSettings.execute.mockResolvedValue({
      installments: {
        ...DEFAULT_INSTALLMENTS_SETTINGS,
        reminder_time: '10:00',
      },
    });

    const result = await controller.patchInstallmentsSettingsRoute(
      staff,
      { reminder_time: '10:00' },
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(result.data.installments.reminder_time).toBe('10:00');
    expect(updateInstallmentSettings.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        patch: { reminder_time: '10:00' },
      }),
    );
  });

  it('rejects empty installments patch body', async () => {
    await expect(
      controller.patchInstallmentsSettingsRoute(
        staff,
        {},
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR' } });
  });

  it('rejects unknown installments patch key', async () => {
    await expect(
      controller.patchInstallmentsSettingsRoute(
        staff,
        { unknown_key: true },
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toMatchObject({ response: { code: 'SETTING_KEY_UNKNOWN' } });
  });

  it('maps invalid key to 400 for core PUT', async () => {
    updateSettingUseCase.execute.mockRejectedValue(
      new ApplicationError('INVALID_SETTING_KEY', 'Unknown setting key: bad_key', 400),
    );

    await expect(
      controller.updateSetting(staff, 'core', 'bad_key', { value: 'toman' }, {
        ip: '127.0.0.1',
        headers: {},
      } as never),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_SETTING_KEY' },
      status: 400,
    });
  });

  it('maps invalid value to 400 for core PUT', async () => {
    updateSettingUseCase.execute.mockRejectedValue(
      new ApplicationError('INVALID_SETTING_VALUE', 'Invalid enum value', 400),
    );

    await expect(
      controller.updateSetting(staff, 'core', 'display_currency', { value: 'usd' }, {
        ip: '127.0.0.1',
        headers: {},
      } as never),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_SETTING_VALUE' },
      status: 400,
    });
  });

  it('rethrows non-application errors', async () => {
    updateSettingUseCase.execute.mockRejectedValue(new Error('db down'));

    await expect(
      controller.updateSetting(staff, 'core', 'display_currency', { value: 'rial' }, {
        ip: '127.0.0.1',
        headers: {},
      } as never),
    ).rejects.toThrow('db down');
  });

  it('wraps application errors as HttpException', async () => {
    updateSettingUseCase.execute.mockRejectedValue(
      new ApplicationError('INVALID_SETTING_KEY', 'Unknown setting key: bad_key', 400),
    );

    await expect(
      controller.updateSetting(staff, 'core', 'bad_key', { value: 'toman' }, {
        ip: '127.0.0.1',
        headers: {},
      } as never),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
