import type { PrintSnapshotPayloadDto } from '@hivork/contracts/core';
import { formatJalaliDate } from '@hivork/i18n';

type PrintHeaderProps = {
  title: string;
  tenant: PrintSnapshotPayloadDto['tenant'];
  locale: PrintSnapshotPayloadDto['locale'];
  generatedAt: string;
};

export function PrintHeader({ title, tenant, locale, generatedAt }: PrintHeaderProps) {
  const dateLabel =
    locale === 'fa-IR'
      ? formatJalaliDate(new Date(generatedAt))
      : generatedAt.slice(0, 10);

  return (
    <header className="print-header">
      <div className="print-header__brand">
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="print-header__logo" src={tenant.logoUrl} alt="" />
        ) : null}
        <div>
          <h1 className="print-header__name">{tenant.name}</h1>
          {tenant.legalName ? <p className="print-header__legal">{tenant.legalName}</p> : null}
          {tenant.taxId ? (
            <p className="print-header__tax">شناسه مالیاتی: {tenant.taxId}</p>
          ) : null}
        </div>
      </div>
      <div className="print-header__meta">
        <p className="print-header__title">{title}</p>
        <p className="print-header__date">
          {locale === 'fa-IR' ? 'تاریخ: ' : 'Date: '}
          {dateLabel}
        </p>
      </div>
    </header>
  );
}
