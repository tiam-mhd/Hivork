import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_INSTALLMENTS_SETTINGS } from '@hivork/contracts';

import { GetInstallmentSettingsUseCase } from './get-installment-settings.use-case.js';
import { UpdateInstallmentSettingsUseCase } from './update-installment-settings.use-case.js';

describe('UpdateInstallmentSettingsUseCase', () => {
  const getSettings = { execute: vi.fn() };
  const settingsRepository = { findByModule: vi.fn(), upsert: vi.fn() };
  const audit = { log: vi.fn() };
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: object) => Promise<void>) => work({})),
  };

  const useCase = new UpdateInstallmentSettingsUseCase(
    getSettings as unknown as GetInstallmentSettingsUseCase,
    settingsRepository,
    audit,
    unitOfWork,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    getSettings.execute.mockResolvedValue({ installments: DEFAULT_INSTALLMENTS_SETTINGS });
    settingsRepository.upsert.mockResolvedValue({
      id: 'setting-record-id',
      tenantId: 'tenant-1',
      module: 'installments',
      key: 'default_installment_count',
      value: 6,
    });
    audit.log.mockResolvedValue(undefined);
  });

  it('returns current settings without writes for empty patch', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      patch: {},
    });

    expect(result.installments).toEqual(DEFAULT_INSTALLMENTS_SETTINGS);
    expect(unitOfWork.transaction).not.toHaveBeenCalled();
    expect(settingsRepository.upsert).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('upserts a single key and writes one audit entry', async () => {
    getSettings.execute
      .mockResolvedValueOnce({ installments: DEFAULT_INSTALLMENTS_SETTINGS })
      .mockResolvedValueOnce({
        installments: { ...DEFAULT_INSTALLMENTS_SETTINGS, default_installment_count: 6 },
      });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      patch: { default_installment_count: 6 },
      ip: '127.0.0.1',
    });

    expect(settingsRepository.upsert).toHaveBeenCalledTimes(1);
    expect(settingsRepository.upsert).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-1',
        module: 'installments',
        key: 'default_installment_count',
        value: 6,
        updatedById: 'staff-1',
      },
      {},
    );
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-1',
        actorType: 'staff',
        actorId: 'staff-1',
        action: 'settings.change',
        entityType: 'TenantSettings',
        entityId: 'setting-record-id',
        oldValue: { default_installment_count: 12 },
        newValue: { default_installment_count: 6 },
        metadata: { module: 'installments', key: 'default_installment_count' },
        ip: '127.0.0.1',
        userAgent: undefined,
      },
      {},
    );
    expect(result.installments.default_installment_count).toBe(6);
  });

  it('writes one audit entry per updated key', async () => {
    getSettings.execute
      .mockResolvedValueOnce({ installments: DEFAULT_INSTALLMENTS_SETTINGS })
      .mockResolvedValueOnce({
        installments: {
          ...DEFAULT_INSTALLMENTS_SETTINGS,
          default_installment_count: 6,
          reminder_on_due_date: false,
        },
      });

    await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      patch: {
        default_installment_count: 6,
        reminder_on_due_date: false,
      },
    });

    expect(settingsRepository.upsert).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledTimes(2);

    const auditCalls = audit.log.mock.calls.map(([entry]) => entry);
    expect(auditCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'setting-record-id',
          metadata: { module: 'installments', key: 'default_installment_count' },
          oldValue: { default_installment_count: 12 },
          newValue: { default_installment_count: 6 },
        }),
        expect.objectContaining({
          entityId: 'setting-record-id',
          metadata: { module: 'installments', key: 'reminder_on_due_date' },
          oldValue: { reminder_on_due_date: true },
          newValue: { reminder_on_due_date: false },
        }),
      ]),
    );
  });

  it('rejects invalid reminder_time', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        patch: { reminder_time: '25:99' },
      }),
    ).rejects.toMatchObject({ code: 'SETTING_VALUE_INVALID', httpStatus: 400 });

    expect(unitOfWork.transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate reminder_days_before values', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        patch: { reminder_days_before: [3, 3] },
      }),
    ).rejects.toMatchObject({ code: 'SETTING_VALUE_INVALID', httpStatus: 400 });
  });

  it('rejects unknown keys via strict schema', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        patch: { unknown_key: true } as never,
      }),
    ).rejects.toMatchObject({ code: 'SETTING_KEY_UNKNOWN', httpStatus: 400 });
  });

  it('rejects read-only contract_number_next_sequence patch', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        patch: { contract_number_next_sequence: 99 } as never,
      }),
    ).rejects.toMatchObject({ code: 'READONLY_SETTING_KEY', httpStatus: 400 });

    expect(unitOfWork.transaction).not.toHaveBeenCalled();
  });
});
