import type { PrintSnapshotPayloadDto } from '@hivork/contracts/core';
import { formatJalaliDate } from '@hivork/i18n';

type PrintFooterProps = {
  tenantName: string;
  locale: PrintSnapshotPayloadDto['locale'];
  generatedAt: string;
};

export function PrintFooter({ tenantName, locale, generatedAt }: PrintFooterProps) {
  const dateLabel =
    locale === 'fa-IR'
      ? formatJalaliDate(new Date(generatedAt))
      : generatedAt.slice(0, 10);

  return (
    <footer className="print-footer">
      <span>{tenantName}</span>
      <span aria-hidden>{locale === 'fa-IR' ? 'صفحه — از —' : 'Page — of —'}</span>
      <span>{dateLabel}</span>
    </footer>
  );
}
