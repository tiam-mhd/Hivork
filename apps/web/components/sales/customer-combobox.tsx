'use client';

import type { TenantCustomerListItemDto } from '@hivork/contracts/customers';
import { Button, Input, Label } from '@hivork/ui';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { apiFetch } from '@/lib/api/client';
import { maskPhone } from '@/lib/auth/phone-utils';
import type { SelectedSaleCustomer } from '@/lib/schemas/sale-form.schema';

type CustomerComboboxProps = {
  value: SelectedSaleCustomer | null;
  onChange: (customer: SelectedSaleCustomer | null) => void;
  disabled?: boolean;
  error?: string;
  returnTo?: string;
};

function toSelectedCustomer(item: TenantCustomerListItemDto): SelectedSaleCustomer {
  return {
    id: item.id,
    name: item.globalCustomer.name,
    phone: item.globalCustomer.phone,
  };
}

function formatCustomerLabel(customer: SelectedSaleCustomer): string {
  const name = customer.name?.trim();
  if (name) {
    return `${name} (${maskPhone(customer.phone)})`;
  }
  return maskPhone(customer.phone);
}

export function CustomerCombobox({
  value,
  onChange,
  disabled = false,
  error,
  returnTo = '/admin/sales/new',
}: CustomerComboboxProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TenantCustomerListItemDto[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchCustomers = useCallback(async (query: string) => {
    setLoading(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ limit: '10', sort: 'name:asc' });
      if (query.trim()) {
        params.set('search', query.trim());
      }
      const response = await apiFetch<{ data: TenantCustomerListItemDto[] }>(
        `/customers?${params.toString()}`,
      );
      setResults(response.data);
    } catch {
      setResults([]);
      setSearchError('جستجوی مشتری ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      void searchCustomers(searchDraft);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [open, searchDraft, searchCustomers]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const newCustomerHref = `/admin/customers/new?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-56 flex-1">
          <Label htmlFor={`${listboxId}-input`}>
            مشتری <span className="text-red-600">*</span>
          </Label>
          <Input
            id={`${listboxId}-input`}
            value={open ? searchDraft : value ? formatCustomerLabel(value) : ''}
            onChange={(event) => {
              setSearchDraft(event.target.value);
              if (!open) {
                setOpen(true);
              }
            }}
            onFocus={() => {
              setOpen(true);
              setSearchDraft('');
              void searchCustomers('');
            }}
            placeholder="جستجو نام یا شماره..."
            disabled={disabled}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-invalid={Boolean(error)}
          />

          {open ? (
            <div
              id={listboxId}
              role="listbox"
              className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-md"
            >
              {loading ? (
                <p className="px-3 py-2 text-sm text-neutral-500">در حال جستجو...</p>
              ) : searchError ? (
                <p className="px-3 py-2 text-sm text-red-600">{searchError}</p>
              ) : results.length === 0 ? (
                <div className="flex flex-col gap-2 px-3 py-3 text-sm">
                  <p className="text-neutral-600">مشتری یافت نشد.</p>
                  <Button asChild size="sm" variant="outline">
                    <Link href={newCustomerHref}>＋ مشتری جدید</Link>
                  </Button>
                </div>
              ) : (
                results.map((item) => {
                  const customer = toSelectedCustomer(item);
                  const label = formatCustomerLabel(customer);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={value?.id === item.id}
                      className="block w-full px-3 py-2 text-start text-sm hover:bg-neutral-50"
                      onClick={() => {
                        onChange(customer);
                        setOpen(false);
                        setSearchDraft('');
                      }}
                    >
                      {label}
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        <Button asChild variant="outline" size="sm" disabled={disabled}>
          <Link href={newCustomerHref}>＋ مشتری جدید</Link>
        </Button>
      </div>

      <p className="text-xs text-neutral-500">مشتری باید قبلاً ثبت شده باشد.</p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
