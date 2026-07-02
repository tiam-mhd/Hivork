'use client';

import { customerValidationMessages } from '@hivork/contracts/customers';
import { Button } from '@hivork/ui';
import { useCallback } from 'react';

import { CustomerAddressRow } from './customer-address-row';

import {
  createEmptyAddressFormValue,
  type CustomerAddressFormValue,
} from '@/lib/schemas/customer-form.schema';


const MAX_ADDRESSES = 10;

type CustomerAddressesSectionProps = {
  addresses: CustomerAddressFormValue[];
  disabled?: boolean;
  addressErrors?: Record<number, string>;
  onChange: (addresses: CustomerAddressFormValue[]) => void;
};

export function CustomerAddressesSection({
  addresses,
  disabled = false,
  addressErrors = {},
  onChange,
}: CustomerAddressesSectionProps) {
  const handleChange = useCallback(
    (index: number, value: CustomerAddressFormValue) => {
      const next = [...addresses];
      next[index] = value;
      onChange(next);
    },
    [addresses, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const next = addresses.filter((_, itemIndex) => itemIndex !== index);
      if (next.length > 0 && !next.some((item) => item.isPrimary)) {
        const first = next[0];
        if (first) {
          next[0] = { ...first, isPrimary: true };
        }
      }
      onChange(next);
    },
    [addresses, onChange],
  );

  const handleSetPrimary = useCallback(
    (index: number) => {
      onChange(
        addresses.map((item, itemIndex) => ({
          ...item,
          isPrimary: itemIndex === index,
        })),
      );
    },
    [addresses, onChange],
  );

  const handleAdd = useCallback(() => {
    if (addresses.length >= MAX_ADDRESSES) {
      return;
    }
    onChange([...addresses, createEmptyAddressFormValue(addresses.length === 0)]);
  }, [addresses, onChange]);

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          آدرس ساخت‌یافته ثبت نشده. برای افزودن آدرس با نقشه، دکمه زیر را بزنید.
        </p>
      ) : null}

      {addresses.map((address, index) => (
        <CustomerAddressRow
          key={address.clientKey}
          index={index}
          value={address}
          disabled={disabled}
          canRemove={addresses.length > 1}
          error={addressErrors[index]}
          onChange={handleChange}
          onRemove={handleRemove}
          onSetPrimary={handleSetPrimary}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={disabled || addresses.length >= MAX_ADDRESSES}
        onClick={handleAdd}
      >
        افزودن آدرس
      </Button>

      {addresses.length >= MAX_ADDRESSES ? (
        <p className="text-xs text-muted-foreground">{customerValidationMessages.addressesMax}</p>
      ) : null}
    </div>
  );
}
