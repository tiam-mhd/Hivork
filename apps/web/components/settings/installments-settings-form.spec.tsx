import type { InstallmentsSettingsReadDto } from '@hivork/contracts/installments';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InstallmentsSettingsForm } from './installments-settings-form';

const VALUES: InstallmentsSettingsReadDto = {
  reminder_days_before: [3, 1],
  reminder_on_due_date: true,
  reminder_time: '09:00',
  overdue_escalation_days: [1, 3, 7],
  default_installment_count: 12,
  block_customer_delete_with_active_sales: true,
  allow_customer_self_report_payment: true,
  require_seller_payment_confirmation: true,
  notify_seller_on_customer_payment_report: true,
  default_reminder_channels: ['telegram'],
  customer_export_max_rows: 5000,
  customer_document_max_bytes: 10485760,
  customer_scoring_payment_confirmed_delta: 5,
  customer_scoring_installment_overdue_delta: -10,
  customer_scoring_sale_completed_on_time_delta: 2,
  customer_auto_blacklist_score_threshold: null,
  calculation_formula: 'equal_installments',
  penalty_type: 'none',
  penalty_rate_bps: 0,
  penalty_fixed_rial: '0',
  penalty_grace_days: 0,
  interest_rate_bps_annual: 0,
  interest_calculation_method: 'none',
  rounding_mode: 'nearest',
  rounding_unit_rial: '1000',
  skip_holidays_in_schedule: true,
  holiday_calendar_source: 'merge_official_and_custom',
  custom_holiday_dates: [],
  calendar_display_mode: 'jalali',
  calendar_input_mode: 'jalali',
  contract_numbering_enabled: true,
  contract_number_prefix: 'CTR',
  contract_number_suffix: 'VIP',
  contract_number_pad_length: 6,
  contract_number_include_year: true,
  contract_number_next_sequence: 42,
};

describe('InstallmentsSettingsForm', () => {
  it('renders numbering preview from settings values', () => {
    const { rerender } = render(
      <InstallmentsSettingsForm
        values={VALUES}
        onChange={() => undefined}
        onSubmit={() => undefined}
        onReset={() => undefined}
      />,
    );

    expect(screen.getByText(/CTR-/)).toBeTruthy();

    rerender(
      <InstallmentsSettingsForm
        values={{ ...VALUES, contract_number_prefix: 'SALE' }}
        onChange={() => undefined}
        onSubmit={() => undefined}
        onReset={() => undefined}
      />,
    );

    expect(screen.getByText(/SALE-/)).toBeTruthy();
  });
});
