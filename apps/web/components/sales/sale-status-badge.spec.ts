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

  it('returns amber styling for terminated sales', () => {
    const presentation = getSaleStatusPresentation('terminated');
    expect(presentation.label).toBe('مختومه');
    expect(presentation.className).toContain('amber');
  });

  it('returns indigo styling for closed sales', () => {
    const presentation = getSaleStatusPresentation('closed');
    expect(presentation.label).toBe('بسته‌شده');
    expect(presentation.className).toContain('indigo');
  });

  it('returns stone styling for archived sales', () => {
    const presentation = getSaleStatusPresentation('archived');
    expect(presentation.label).toBe('بایگانی');
    expect(presentation.className).toContain('stone');
  });
});
