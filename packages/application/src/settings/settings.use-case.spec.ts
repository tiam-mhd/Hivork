import { describe, expect, it, vi } from 'vitest';

import { GetSettingsUseCase } from './get-setting.use-case.js';
import { UpdateSettingUseCase } from './update-setting.use-case.js';

const coreSettingsSchema = {
  timezone: { type: 'enum' as const, values: ['Asia/Tehran'], default: 'Asia/Tehran' },
  display_currency: { type: 'enum' as const, values: ['toman', 'rial'], default: 'toman' },
};

const installmentsSettingsSchema = {
  defaultGraceDays: { type: 'number' as const, min: 0, max: 30, default: 0 },
  lateFeePercent: { type: 'bigint-string' as const, min: '0', max: '10000', default: '0' },
};

const remindersSettingsSchema = {
  enabled: { type: 'boolean' as const, default: true },
  daysBefore: { type: 'number' as const, min: 1, max: 30, default: 3 },
  channels: { type: 'enum-array' as const, values: ['sms', 'telegram', 'bale'] as const, default: ['sms'] },
};

const allSchemas: Record<string, typeof coreSettingsSchema | typeof installmentsSettingsSchema | typeof remindersSettingsSchema> = {
  core: coreSettingsSchema,
  installments: installmentsSettingsSchema,
  reminders: remindersSettingsSchema,
};

const schemaRegistry = {
  getSchema: (module: string) => allSchemas[module],
  hasModule: (module: string) => module in allSchemas,
};

describe('GetSettingsUseCase', () => {
  const settingsRepository = { findByModule: vi.fn(), upsert: vi.fn() };
  const useCase = new GetSettingsUseCase(schemaRegistry, settingsRepository);

  it('returns schema defaults when nothing is stored', async () => {
    settingsRepository.findByModule.mockResolvedValue({});

    const result = await useCase.execute({ tenantId: 'tenant-1', module: 'core' });

    expect(result).toEqual({
      module: 'core',
      settings: {
        timezone: 'Asia/Tehran',
        display_currency: 'toman',
      },
    });
  });

  it('rejects unknown module', async () => {
    await expect(
      useCase.execute({ tenantId: 'tenant-1', module: 'unknown' }),
    ).rejects.toMatchObject({ code: 'UNKNOWN_SETTINGS_MODULE', httpStatus: 400 });
  });
});

describe('UpdateSettingUseCase', () => {
  const settingsRepository = { findByModule: vi.fn(), upsert: vi.fn() };
  const audit = { log: vi.fn() };
  const useCase = new UpdateSettingUseCase(schemaRegistry, settingsRepository, audit);

  it('upserts valid value and writes audit log', async () => {
    settingsRepository.findByModule.mockResolvedValue({ display_currency: 'toman' });
    settingsRepository.upsert.mockResolvedValue({
      id: 'setting-1',
      tenantId: 'tenant-1',
      module: 'core',
      key: 'display_currency',
      value: 'rial',
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      module: 'core',
      key: 'display_currency',
      value: 'rial',
      staffId: 'staff-1',
    });

    expect(result).toEqual({ module: 'core', key: 'display_currency', value: 'rial' });
    expect(settingsRepository.upsert).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      module: 'core',
      key: 'display_currency',
      value: 'rial',
      updatedById: 'staff-1',
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'settings.change',
        oldValue: 'toman',
        newValue: 'rial',
      }),
    );
  });

  it('rejects invalid key', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        module: 'core',
        key: 'not_a_key',
        value: 'toman',
        staffId: 'staff-1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SETTING_KEY', httpStatus: 400 });
  });

  it('rejects invalid value', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        module: 'core',
        key: 'display_currency',
        value: 'usd',
        staffId: 'staff-1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SETTING_VALUE', httpStatus: 400 });
  });
});

describe('UpdateSettingUseCase — number type', () => {
  const settingsRepository = { findByModule: vi.fn(), upsert: vi.fn() };
  const audit = { log: vi.fn() };
  const useCase = new UpdateSettingUseCase(schemaRegistry, settingsRepository, audit);

  it('accepts valid number within range', async () => {
    settingsRepository.findByModule.mockResolvedValue({});
    settingsRepository.upsert.mockResolvedValue({});

    const result = await useCase.execute({
      tenantId: 't1',
      module: 'installments',
      key: 'defaultGraceDays',
      value: 7,
      staffId: 's1',
    });

    expect(result.value).toBe(7);
  });

  it('rejects number above max', async () => {
    await expect(
      useCase.execute({ tenantId: 't1', module: 'installments', key: 'defaultGraceDays', value: 31, staffId: 's1' }),
    ).rejects.toMatchObject({ code: 'INVALID_SETTING_VALUE' });
  });

  it('rejects non-integer for number type', async () => {
    await expect(
      useCase.execute({ tenantId: 't1', module: 'installments', key: 'defaultGraceDays', value: 1.5, staffId: 's1' }),
    ).rejects.toMatchObject({ code: 'INVALID_SETTING_VALUE' });
  });
});

describe('UpdateSettingUseCase — bigint-string type', () => {
  const settingsRepository = { findByModule: vi.fn(), upsert: vi.fn() };
  const audit = { log: vi.fn() };
  const useCase = new UpdateSettingUseCase(schemaRegistry, settingsRepository, audit);

  it('accepts valid bigint string', async () => {
    settingsRepository.findByModule.mockResolvedValue({});
    settingsRepository.upsert.mockResolvedValue({});

    const result = await useCase.execute({
      tenantId: 't1',
      module: 'installments',
      key: 'lateFeePercent',
      value: '150',
      staffId: 's1',
    });

    expect(result.value).toBe('150');
  });

  it('rejects non-numeric string', async () => {
    await expect(
      useCase.execute({ tenantId: 't1', module: 'installments', key: 'lateFeePercent', value: 'abc', staffId: 's1' }),
    ).rejects.toMatchObject({ code: 'INVALID_SETTING_VALUE' });
  });

  it('rejects value exceeding max', async () => {
    await expect(
      useCase.execute({ tenantId: 't1', module: 'installments', key: 'lateFeePercent', value: '99999', staffId: 's1' }),
    ).rejects.toMatchObject({ code: 'INVALID_SETTING_VALUE' });
  });
});

describe('UpdateSettingUseCase — enum-array type', () => {
  const settingsRepository = { findByModule: vi.fn(), upsert: vi.fn() };
  const audit = { log: vi.fn() };
  const useCase = new UpdateSettingUseCase(schemaRegistry, settingsRepository, audit);

  it('accepts valid array of enum values', async () => {
    settingsRepository.findByModule.mockResolvedValue({});
    settingsRepository.upsert.mockResolvedValue({});

    const result = await useCase.execute({
      tenantId: 't1',
      module: 'reminders',
      key: 'channels',
      value: ['sms', 'telegram'],
      staffId: 's1',
    });

    expect(result.value).toEqual(['sms', 'telegram']);
  });

  it('rejects invalid enum member', async () => {
    await expect(
      useCase.execute({ tenantId: 't1', module: 'reminders', key: 'channels', value: ['sms', 'whatsapp'], staffId: 's1' }),
    ).rejects.toMatchObject({ code: 'INVALID_SETTING_VALUE' });
  });
});
