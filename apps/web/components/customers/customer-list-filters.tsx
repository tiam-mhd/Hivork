'use client';

import type { TenantCustomerListSortDto } from '@hivork/contracts/customers';
import { Button, Checkbox } from '@hivork/ui';
import { useCallback, useId, useState } from 'react';

/** Common tenant customer tags — free-form tags may also appear in URL filters. */
export const CUSTOMER_TAG_PRESETS = ['vip', 'regular', 'wholesale', 'loyal'] as const;

const TAG_LABELS: Record<(typeof CUSTOMER_TAG_PRESETS)[number], string> = {
  vip: 'VIP',
  regular: 'عادی',
  wholesale: 'عمده',
  loyal: 'وفادار',
};

export type CustomerListFiltersState = {
  search: string;
  tags: string[];
  sort: TenantCustomerListSortDto;
  limit: number;
};

type CustomerListFiltersProps = {
  value: CustomerListFiltersState;
  onChange: (next: CustomerListFiltersState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  disabled?: boolean;
};

export function CustomerListFilters({
  value,
  onChange,
  onClear,
  hasActiveFilters,
  disabled = false,
}: CustomerListFiltersProps) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);

  const toggleTag = useCallback(
    (tag: string, checked: boolean) => {
      const selected = checked
        ? [...value.tags, tag]
        : value.tags.filter((item) => item !== tag);
      onChange({ ...value, tags: selected });
    },
    [onChange, value],
  );

  const activeCount = (value.search.trim() ? 1 : 0) + (value.tags.length > 0 ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 gap-1.5"
            disabled={disabled}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((open) => !open)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            فیلترها
            {activeCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </Button>

          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" className="h-10" onClick={onClear} disabled={disabled}>
              پاک کردن
            </Button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div id={panelId} className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
          <fieldset className="flex flex-col gap-2" disabled={disabled}>
            <legend className="text-sm font-medium text-foreground">برچسب</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {CUSTOMER_TAG_PRESETS.map((tag) => (
                <label key={tag} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={value.tags.includes(tag)}
                    onCheckedChange={(checked) => toggleTag(tag, checked === true)}
                  />
                  <span>{TAG_LABELS[tag]}</span>
                </label>
              ))}
            </div>
            {value.tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">همه برچسب‌ها</p>
            ) : null}
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
