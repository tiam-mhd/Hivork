import type { PrintSnapshotPayloadDto } from '@hivork/contracts/core';
import type { ReactNode } from 'react';

import { PrintFooter } from './print-footer';
import { PrintHeader } from './print-header';
import { PrintTable } from './print-table';

import './print-styles.css';

type PrintLayoutProps = {
  title: string;
  tenant: PrintSnapshotPayloadDto['tenant'];
  locale: PrintSnapshotPayloadDto['locale'];
  orientation?: PrintSnapshotPayloadDto['orientation'];
  generatedAt: string;
  columns: PrintSnapshotPayloadDto['columns'];
  rows: PrintSnapshotPayloadDto['rows'];
  children?: ReactNode;
};

export function PrintLayout({
  title,
  tenant,
  locale,
  orientation = 'portrait',
  generatedAt,
  columns,
  rows,
  children,
}: PrintLayoutProps) {
  const dir = locale === 'fa-IR' ? 'rtl' : 'ltr';
  const rootClass =
    orientation === 'landscape' ? 'print-root print-root--landscape' : 'print-root';

  return (
    <div className={rootClass} dir={dir}>
      <PrintHeader title={title} tenant={tenant} locale={locale} generatedAt={generatedAt} />
      {children ?? <PrintTable columns={columns} rows={rows} />}
      <PrintFooter tenantName={tenant.name} locale={locale} generatedAt={generatedAt} />
    </div>
  );
}
