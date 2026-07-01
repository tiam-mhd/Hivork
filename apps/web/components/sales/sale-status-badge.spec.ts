import { describe, expect, it } from 'vitest';

import { getSaleStatusPresentation } from '@/lib/sales/sale-status';

describe('getSaleStatusPresentation', () => {
  it('returns green styling for active sales', () => {
    const presentation = getSaleStatusPresentation('active');
    expect(presentation.label).toBe('فعال');
    expect(presentation.className).toContain('emerald');
    expect(presentation.emoji).toBe('🟢');
  });

  it('returns blue styling for completed sales', () => {
    const presentation = getSaleStatusPresentation('completed');
    expect(presentation.label).toBe('تکمیل‌شده');
    expect(presentation.className).toContain('sky');
    expect(presentation.emoji).toBe('✅');
  });

  it('returns gray styling for cancelled sales', () => {
    const presentation = getSaleStatusPresentation('cancelled');
    expect(presentation.label).toBe('لغو‌شده');
    expect(presentation.className).toContain('muted');
    expect(presentation.emoji).toBe('⚫');
  });
});
