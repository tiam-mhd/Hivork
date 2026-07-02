import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_INSTALLMENTS_SETTINGS } from '@hivork/contracts';

import { GetInstallmentSettingsUseCase } from './get-installment-settings.use-case.js';
import { mergeInstallmentsSettings } from './merge-installments-settings.js';

describe('mergeInstallmentsSettings', () => {
  it('returns all defaults when store is empty', () => {
    expect(mergeInstallmentsSettings({})).toEqual(DEFAULT_INSTALLMENTS_SETTINGS);
  });

  it('merges partial stored values over defaults', () => {
    const merged = mergeInstallmentsSettings({
      default_installment_count: 6,
      reminder_on_due_date: false,
    });

    expect(merged.default_installment_count).toBe(6);
    expect(merged.reminder_on_due_date).toBe(false);
    expect(merged.reminder_days_before).toEqual(DEFAULT_INSTALLMENTS_SETTINGS.reminder_days_before);
    expect(merged.reminder_time).toBe(DEFAULT_INSTALLMENTS_SETTINGS.reminder_time);
  });

  it('falls back to default for invalid stored values', () => {
    const merged = mergeInstallmentsSettings({
      reminder_time: '25:99',
      default_installment_count: 999,
      default_reminder_channels: ['whatsapp'],
    });

    expect(merged.reminder_time).toBe('09:00');
    expect(merged.default_installment_count).toBe(12);
    expect(merged.default_reminder_channels).toEqual(['telegram']);
  });
});

describe('GetInstallmentSettingsUseCase', () => {
  const moduleEntitlement = { assertModuleEnabled: vi.fn() };
  const settingsRepository = { findByModule: vi.fn(), upsert: vi.fn() };
  const sequences = { peekNextValue: vi.fn(), allocateNextValue: vi.fn() };
  const useCase = new GetInstallmentSettingsUseCase(
    moduleEntitlement,
    settingsRepository,
    sequences,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    moduleEntitlement.assertModuleEnabled.mockResolvedValue(undefined);
    settingsRepository.findByModule.mockResolvedValue({});
    sequences.peekNextValue.mockResolvedValue(1);
  });

  it('returns defaults when nothing is stored', async () => {
    const result = await useCase.execute({ tenantId: 'tenant-1' });

    expect(moduleEntitlement.assertModuleEnabled).toHaveBeenCalledWith('tenant-1', 'installments');
    expect(settingsRepository.findByModule).toHaveBeenCalledWith('tenant-1', 'installments');
    expect(sequences.peekNextValue).toHaveBeenCalledWith('tenant-1', 'contract_number');
    expect(result.installments).toEqual({
      ...DEFAULT_INSTALLMENTS_SETTINGS,
      contract_number_next_sequence: 1,
    });
  });

  it('returns merged settings when partial values are stored', async () => {
    settingsRepository.findByModule.mockResolvedValue({
      default_installment_count: 24,
      overdue_escalation_days: [2, 5],
    });
    sequences.peekNextValue.mockResolvedValue(42);

    const result = await useCase.execute({ tenantId: 'tenant-1' });

    expect(result.installments.default_installment_count).toBe(24);
    expect(result.installments.overdue_escalation_days).toEqual([2, 5]);
    expect(result.installments.reminder_days_before).toEqual([3, 1]);
    expect(result.installments.contract_number_next_sequence).toBe(42);
  });

  it('rejects when installments module is not enabled', async () => {
    moduleEntitlement.assertModuleEnabled.mockRejectedValue({
      code: 'MODULE_NOT_ENABLED',
      httpStatus: 403,
    });

    await expect(useCase.execute({ tenantId: 'tenant-1' })).rejects.toMatchObject({
      code: 'MODULE_NOT_ENABLED',
      httpStatus: 403,
    });
    expect(settingsRepository.findByModule).not.toHaveBeenCalled();
  });
});
