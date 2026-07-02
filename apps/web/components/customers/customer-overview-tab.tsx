'use client';

import type { TenantCustomerDetailResponseDto } from '@hivork/contracts/customers';
import { formatIsoDateAsJalali, formatPersianDigits } from '@hivork/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@hivork/ui';

import { CustomerStatsPanel } from '@/components/customers/customer-stats-panel';
import { CustomerStatusBadge } from '@/components/customers/customer-status-badge';
import { TagBadge } from '@/components/customers/tag-badge';
import { maskPhone } from '@/lib/auth/phone-utils';

type CustomerOverviewTabProps = {
  detail: TenantCustomerDetailResponseDto;
  assignedStaffName?: string | null;
};

export function CustomerOverviewTab({ detail, assignedStaffName }: CustomerOverviewTabProps) {
  return (
    <div className="grid gap-4">
      <CustomerStatsPanel stats={detail} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">اطلاعات پایه</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">کد مشتری: </span>
              {detail.localCode ?? '—'}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">وضعیت: </span>
              <CustomerStatusBadge linkStatus={detail.linkStatus} isBlacklisted={detail.isBlacklisted} />
            </p>
            <p>
              <span className="text-muted-foreground">دسته‌بندی: </span>
              {detail.category?.name ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">مسئول: </span>
              {assignedStaffName ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">تاریخ ثبت: </span>
              {formatIsoDateAsJalali(detail.createdAt.slice(0, 10))}
            </p>
            {detail.globalCustomer.nationalId ? (
              <p>
                <span className="text-muted-foreground">کد ملی: </span>
                <span dir="ltr">{formatPersianDigits(detail.globalCustomer.nationalId)}</span>
              </p>
            ) : null}
            {detail.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {detail.tags.map((tag) => (
                  <TagBadge key={tag} label={tag} />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">تماس</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">موبایل: </span>
              <span className="font-mono" dir="ltr">
                {maskPhone(detail.globalCustomer.phone)}
              </span>
            </p>
            {detail.globalCustomer.email ? (
              <p>
                <span className="text-muted-foreground">ایمیل: </span>
                <span dir="ltr">{detail.globalCustomer.email}</span>
              </p>
            ) : null}
            {detail.contactPhones && detail.contactPhones.length > 0 ? (
              <ul className="space-y-1 pt-1">
                {detail.contactPhones.map((phone) => (
                  <li key={phone.id}>
                    <span className="text-muted-foreground">{phone.label ?? 'تلفن'}: </span>
                    <span className="font-mono" dir="ltr">
                      {maskPhone(phone.phone)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        {detail.salesSummary ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">خلاصه فروش</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <p>
                <span className="text-muted-foreground">فروش فعال: </span>
                {formatPersianDigits(detail.salesSummary.activeSalesCount)}
              </p>
              <p>
                <span className="text-muted-foreground">فروش تکمیل‌شده: </span>
                {formatPersianDigits(detail.salesSummary.completedSalesCount)}
              </p>
              <p>
                <span className="text-muted-foreground">آخرین فروش: </span>
                {detail.salesSummary.lastSaleAt
                  ? formatIsoDateAsJalali(detail.salesSummary.lastSaleAt.slice(0, 10))
                  : '—'}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {detail.emergencyContacts && detail.emergencyContacts.length > 0 ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">تماس اضطراری</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {detail.emergencyContacts.map((contact) => (
                <div key={contact.id} className="rounded-xl border border-border/80 p-3 text-sm">
                  <p className="font-medium">{contact.name}</p>
                  <p className="font-mono text-muted-foreground" dir="ltr">
                    {maskPhone(contact.phone)}
                  </p>
                  {contact.relation ? (
                    <p className="text-xs text-muted-foreground">{contact.relation}</p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
