import { InstallmentOperationsService, InstallmentStatus } from '@hivork/domain';
import { describe, expect, it } from 'vitest';

describe('AccelerateInstallmentUseCase (domain delegation)', () => {
  it('resolves overdue to pending when new due date is on or after today', () => {
    const now = new Date('2026-07-02T12:00:00.000Z');
    const status = InstallmentOperationsService.resolveAccelerateStatus(
      InstallmentStatus.OVERDUE,
      new Date('2026-07-02T12:00:00.000Z'),
      now,
    );

    expect(status).toBe(InstallmentStatus.PENDING);
  });

  it('keeps pending status unchanged', () => {
    const status = InstallmentOperationsService.resolveAccelerateStatus(
      InstallmentStatus.PENDING,
      new Date('2026-06-01T12:00:00.000Z'),
      new Date('2026-07-02T12:00:00.000Z'),
    );

    expect(status).toBe(InstallmentStatus.PENDING);
  });
});
