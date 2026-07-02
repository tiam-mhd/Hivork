'use client';

import dynamic from 'next/dynamic';

const AddressMapPicker = dynamic(
  () => import('./address-map-picker').then((module) => module.AddressMapPicker),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-40 w-full animate-pulse rounded-xl border border-border bg-muted"
        aria-hidden
      />
    ),
  },
);

type AddressMapPreviewProps = {
  latitude: number;
  longitude: number;
  className?: string;
};

export function AddressMapPreview({ latitude, longitude, className }: AddressMapPreviewProps) {
  return (
    <div className={className}>
      <AddressMapPicker
        latitude={latitude}
        longitude={longitude}
        readOnly
        onChange={() => undefined}
      />
    </div>
  );
}
