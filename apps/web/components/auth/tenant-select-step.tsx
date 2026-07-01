'use client';

import { Button } from '@hivork/ui';

export type TenantOption = {
  slug: string;
  name: string;
};

type TenantSelectStepProps = {
  tenants: TenantOption[];
  selectedSlug: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (slug: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export function TenantSelectStep({
  tenants,
  selectedSlug,
  loading,
  error,
  onSelect,
  onSubmit,
  onBack,
}: TenantSelectStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">مرحله ۳ از ۴: انتخاب فروشگاه</p>
      <p className="text-xs text-neutral-500">چند فروشگاه با این شماره مرتبط است. یکی را انتخاب کنید.</p>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">انتخاب فروشگاه</legend>
        {tenants.map((tenant) => (
          <label
            key={tenant.slug}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-neutral-200 px-3 py-2 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
          >
            <input
              type="radio"
              name="tenant"
              value={tenant.slug}
              checked={selectedSlug === tenant.slug}
              onChange={() => onSelect(tenant.slug)}
              className="size-4"
            />
            <span>{tenant.name}</span>
          </label>
        ))}
      </fieldset>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button
        type="button"
        className="min-h-11 w-full"
        disabled={loading || !selectedSlug}
        onClick={onSubmit}
      >
        {loading ? 'در حال ورود…' : 'ادامه →'}
      </Button>
      <Button type="button" variant="outline" className="min-h-11 w-full" onClick={onBack}>
        بازگشت
      </Button>
    </div>
  );
}
