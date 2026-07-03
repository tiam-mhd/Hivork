'use client';

import type { InstallmentStatusDto } from '@hivork/contracts/installments';
import { Button, Input, Label } from '@hivork/ui';

import { DatePicker } from '@/components/date-picker';
import {
  ALL_INSTALLMENT_STATUSES,
  type InstallmentsListFiltersState,
} from '@/lib/installments/installments-list.utils';
import { getInstallmentStatusPresentation } from '@/lib/sales/installment-status';

const STATUS_LABELS: Record<InstallmentStatusDto, string> = {
  pending: getInstallmentStatusPresentation('pending').label,
  overdue: getInstallmentStatusPresentation('overdue').label,
  paid: getInstallmentStatusPresentation('paid').label,
  waived: getInstallmentStatusPresentation('waived').label,
};

type InstallmentsFiltersProps = {
  value: InstallmentsListFiltersState;
  branches: Array<{ id: string; name: string }>;
  onChange: (next: InstallmentsListFiltersState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  disabled?: boolean;
  hideSaleFilter?: boolean;
};

export function InstallmentsFilters({
  value,
  branches,
  onChange,
  onClear,
  hasActiveFilters,
  disabled = false,
  hideSaleFilter = false,
}: InstallmentsFiltersProps) {
  function toggleStatus(status: InstallmentStatusDto) {
    const exists = value.statuses.includes(status);
    onChange({
      ...value,
      statuses: exists
        ? value.statuses.filter((item) => item !== status)
        : [...value.statuses, status],
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-2">
          <DatePicker
            label="از تاریخ سررسید"
            value={value.from}
            onChange={(from) => onChange({ ...value, from: from ?? '' })}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-2">
          <DatePicker
            label="تا تاریخ سررسید"
            value={value.to}
            onChange={(to) => onChange({ ...value, to: to ?? '' })}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="installments-branch">شعبه</Label>
          <select
            id="installments-branch"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={value.branchId}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, branchId: event.target.value })}
          >
            <option value="">همه شعب</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        {!hideSaleFilter ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="installments-sale">شناسه قرارداد</Label>
            <Input
              id="installments-sale"
              value={value.saleId}
              placeholder="UUID قرارداد"
              disabled={disabled}
              onChange={(event) => onChange({ ...value, saleId: event.target.value.trim() })}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">وضعیت:</span>
        {ALL_INSTALLMENT_STATUSES.map((status) => {
          const active = value.statuses.includes(status);
          return (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              disabled={disabled}
              onClick={() => toggleStatus(status)}
            >
              {STATUS_LABELS[status]}
            </Button>
          );
        })}
      </div>

      {hasActiveFilters ? (
        <div>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onClear}>
            پاک کردن فیلترها
          </Button>
        </div>
      ) : null}
    </div>
  );
}
