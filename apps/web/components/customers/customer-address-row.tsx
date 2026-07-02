'use client';

import { customerValidationMessages } from '@hivork/contracts/customers';
import { Button, Input, Label, Select } from '@hivork/ui';
import { useCallback, useId, useState } from 'react';

import { AddressMapPicker } from '@/components/maps/address-map-picker';
import { CUSTOMER_ADDRESS_LABEL_OPTIONS } from '@/lib/customers/customer-address-labels';
import type { CustomerAddressFormValue } from '@/lib/schemas/customer-form.schema';

type CustomerAddressRowProps = {
  index: number;
  value: CustomerAddressFormValue;
  disabled?: boolean;
  canRemove: boolean;
  error?: string;
  onChange: (index: number, value: CustomerAddressFormValue) => void;
  onRemove: (index: number) => void;
  onSetPrimary: (index: number) => void;
};

export function CustomerAddressRow({
  index,
  value,
  disabled = false,
  canRemove,
  error,
  onChange,
  onRemove,
  onSetPrimary,
}: CustomerAddressRowProps) {
  const baseId = useId();
  const [mapError, setMapError] = useState<string | null>(null);

  const setField = useCallback(
    <K extends keyof CustomerAddressFormValue>(key: K, fieldValue: CustomerAddressFormValue[K]) => {
      onChange(index, { ...value, [key]: fieldValue });
    },
    [index, onChange, value],
  );

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">آدرس {index + 1}</p>
        <div className="flex flex-wrap gap-2">
          {!value.isPrimary ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onSetPrimary(index)}
            >
              پیش‌فرض
            </Button>
          ) : (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">پیش‌فرض</span>
          )}
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onRemove(index)}
            >
              حذف
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${baseId}-label`}>نوع آدرس</Label>
          <Select
            id={`${baseId}-label`}
            className="min-h-11"
            value={value.label}
            disabled={disabled}
            onChange={(event) => setField('label', event.target.value as CustomerAddressFormValue['label'])}
          >
            {CUSTOMER_ADDRESS_LABEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={`${baseId}-line1`}>
            آدرس (خط اول) <span className="text-red-600">*</span>
          </Label>
          <Input
            id={`${baseId}-line1`}
            value={value.line1}
            disabled={disabled}
            placeholder="خیابان، پلاک، واحد"
            aria-invalid={Boolean(error)}
            onChange={(event) => setField('line1', event.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={`${baseId}-line2`}>آدرس (خط دوم)</Label>
          <Input
            id={`${baseId}-line2`}
            value={value.line2}
            disabled={disabled}
            onChange={(event) => setField('line2', event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${baseId}-city`}>شهر</Label>
          <Input
            id={`${baseId}-city`}
            value={value.city}
            disabled={disabled}
            onChange={(event) => setField('city', event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${baseId}-province`}>استان</Label>
          <Input
            id={`${baseId}-province`}
            value={value.province}
            disabled={disabled}
            onChange={(event) => setField('province', event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${baseId}-postalCode`}>کد پستی</Label>
          <Input
            id={`${baseId}-postalCode`}
            inputMode="numeric"
            maxLength={10}
            value={value.postalCode}
            disabled={disabled}
            placeholder="۱۰ رقم"
            onChange={(event) => setField('postalCode', event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <AddressMapPicker
          latitude={value.latitude}
          longitude={value.longitude}
          disabled={disabled}
          onChange={({ latitude, longitude }) => {
            onChange(index, { ...value, latitude, longitude });
          }}
          onError={setMapError}
        />
        {mapError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {mapError}
          </p>
        ) : null}
        {value.latitude !== null && value.longitude !== null ? (
          <p className="mt-2 text-xs text-muted-foreground" dir="ltr">
            {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{customerValidationMessages.locationOptionalHelp}</p>
        )}
      </div>
    </div>
  );
}
