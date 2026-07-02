'use client';

import type { TenantCustomerDetailResponseDto } from '@hivork/contracts/customers';
import { Card, CardContent, CardHeader, CardTitle } from '@hivork/ui';

import { AddressMapPreview } from '@/components/maps/address-map-preview';
import { customerAddressLabelText } from '@/lib/customers/customer-address-labels';

type CustomerAddressesTabProps = {
  detail: TenantCustomerDetailResponseDto;
};

export function CustomerAddressesTab({ detail }: CustomerAddressesTabProps) {
  const addresses = detail.addresses ?? [];

  if (addresses.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          آدرسی ثبت نشده است.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {addresses.map((address) => (
        <Card key={address.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {customerAddressLabelText(address.label ?? 'home')}
              {address.isPrimary ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                  پیش‌فرض
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{address.line1}</p>
            {address.line2 ? <p className="text-muted-foreground">{address.line2}</p> : null}
            <p className="text-muted-foreground">
              {[address.city, address.province, address.postalCode].filter(Boolean).join('، ') ||
                '—'}
            </p>
            {address.latitude != null && address.longitude != null ? (
              <div className="pt-2">
                <AddressMapPreview latitude={address.latitude} longitude={address.longitude} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
