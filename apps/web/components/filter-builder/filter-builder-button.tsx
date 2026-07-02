'use client';

import type { FilterAst, FilterFieldDef } from '@hivork/contracts/ui';
import { formatPersianDigits } from '@hivork/i18n';
import { Button, cn } from '@hivork/ui';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { FilterBuilder } from './filter-builder';

import {
  countActiveFilterConditions,
  createEmptyFilterAst,
  validateFilterAstForApply,
} from '@/lib/filter/filter-ast.utils';


type FilterBuilderButtonProps = {
  fields: FilterFieldDef[];
  value: FilterAst | null;
  onChange: (value: FilterAst | null) => void;
  onApply: (value: FilterAst | null) => void;
  quickFilters?: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function FilterBuilderButton({
  fields,
  value,
  onChange,
  onApply,
  quickFilters,
  disabled = false,
  className,
}: FilterBuilderButtonProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterAst>(() => value ?? createEmptyFilterAst(fields[0]?.id));
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const activeCount = useMemo(
    () => countActiveFilterConditions(value, fields),
    [fields, value],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraft(value ?? createEmptyFilterAst(fields[0]?.id));
    setValidationMessage(null);
  }, [fields, open, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleApply = useCallback(() => {
    const validation = validateFilterAstForApply(draft, fields);
    if (!validation.valid) {
      setValidationMessage(validation.message);
      return;
    }

    onChange(draft);
    onApply(draft);
    setOpen(false);
  }, [draft, fields, onApply, onChange]);

  const handleClearAll = useCallback(() => {
    const empty = createEmptyFilterAst(fields[0]?.id);
    setDraft(empty);
    onChange(null);
    onApply(null);
    setValidationMessage(null);
    setOpen(false);
  }, [fields, onApply, onChange]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    setValidationMessage(null);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('h-10 gap-1.5', className)}
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
        فیلتر پیشرفته
        {activeCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {formatPersianDigits(activeCount)}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="بستن فیلتر پیشرفته"
            onClick={handleCancel}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-xl md:rounded-2xl">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">فیلتر پیشرفته</h2>
            </div>

            <div className="overflow-y-auto px-4 py-4">
              <FilterBuilder
                fields={fields}
                value={draft}
                onChange={setDraft}
                quickFilters={quickFilters}
                disabled={disabled}
                validationMessage={validationMessage}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
              <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={handleClearAll}>
                پاک کردن همه
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                  انصراف
                </Button>
                <Button type="button" size="sm" disabled={disabled} onClick={handleApply}>
                  اعمال فیلتر
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
