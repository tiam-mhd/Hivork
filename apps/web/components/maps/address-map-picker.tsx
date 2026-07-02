'use client';

import dynamic from 'next/dynamic';

import type { AddressMapPickerInnerProps } from './address-map-picker-inner';

const AddressMapPickerInner = dynamic(
  () => import('./address-map-picker-inner').then((module) => module.AddressMapPickerInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-64 w-full animate-pulse rounded-xl border border-border bg-muted"
        aria-hidden
      />
    ),
  },
);

export type AddressMapPickerProps = AddressMapPickerInnerProps;

export function AddressMapPicker(props: AddressMapPickerProps) {
  return <AddressMapPickerInner {...props} />;
}
