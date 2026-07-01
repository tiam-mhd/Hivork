import { formatIsoDateAsJalali, formatJalaliDate } from '@hivork/i18n';

import type { ExportLocaleDto, TenantBrandingDto } from '@hivork/contracts/core';

export type PrintLayoutOrientation = 'portrait' | 'landscape';

export type PrintLayoutColumn = {
  id: string;
  header: string;
};

export type PrintLayoutData = {
  title: string;
  locale: ExportLocaleDto;
  orientation: PrintLayoutOrientation;
  tenant: TenantBrandingDto;
  generatedAt: Date;
  columns: PrintLayoutColumn[];
  rows: string[][];
};

const PRINT_STYLES = `
@page {
  size: A4 portrait;
  margin: 12mm;
}
@page landscape {
  size: A4 landscape;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0;
  font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
  font-size: 11px;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.print-root {
  width: 100%;
}
.print-root--landscape @page { size: A4 landscape; }
.print-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #1a1a1a;
  margin-bottom: 16px;
}
.print-header__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.print-header__logo {
  max-height: 48px;
  max-width: 120px;
  object-fit: contain;
}
.print-header__name {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}
.print-header__legal {
  font-size: 10px;
  color: #444;
  margin: 2px 0 0;
}
.print-header__tax {
  font-size: 10px;
  color: #444;
  margin: 2px 0 0;
}
.print-header__meta {
  text-align: end;
  flex-shrink: 0;
}
.print-header__title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px;
}
.print-header__date {
  font-size: 10px;
  color: #555;
  margin: 0;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
}
.print-table th,
.print-table td {
  border: 1px solid #ccc;
  padding: 6px 8px;
  text-align: start;
  vertical-align: top;
  word-break: break-word;
}
.print-table th {
  background: #f3f4f6;
  font-weight: 600;
}
.print-table tbody tr:nth-child(even) {
  background: #fafafa;
}
.print-footer {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid #ddd;
  font-size: 9px;
  color: #666;
  display: flex;
  justify-content: space-between;
}
.print-root[dir='rtl'] {
  direction: rtl;
}
.print-root[dir='ltr'] {
  direction: ltr;
}
@media print {
  .no-print { display: none !important; }
}
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatGeneratedAtLabel(date: Date, locale: ExportLocaleDto): string {
  if (locale === 'fa-IR') {
    return formatJalaliDate(date);
  }
  return date.toISOString().slice(0, 10);
}

export function renderPrintLayoutHtml(data: PrintLayoutData): string {
  const dir = data.locale === 'fa-IR' ? 'rtl' : 'ltr';
  const generatedLabel = formatGeneratedAtLabel(data.generatedAt, data.locale);
  const landscapeClass = data.orientation === 'landscape' ? ' print-root--landscape' : '';

  const logoHtml = data.tenant.logoUrl
    ? `<img class="print-header__logo" src="${escapeHtml(data.tenant.logoUrl)}" alt="" />`
    : '';

  const legalHtml = data.tenant.legalName
    ? `<p class="print-header__legal">${escapeHtml(data.tenant.legalName)}</p>`
    : '';

  const taxHtml = data.tenant.taxId
    ? `<p class="print-header__tax">شناسه مالیاتی: ${escapeHtml(data.tenant.taxId)}</p>`
    : '';

  const headerCells = data.columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('');
  const bodyRows = data.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('');

  const pageSizeStyle =
    data.orientation === 'landscape'
      ? '@page { size: A4 landscape; margin: 12mm; }'
      : '@page { size: A4 portrait; margin: 12mm; }';

  return `<!DOCTYPE html>
<html lang="${data.locale === 'fa-IR' ? 'fa' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.title)}</title>
  <style>${PRINT_STYLES}${pageSizeStyle}</style>
</head>
<body>
  <div class="print-root${landscapeClass}" dir="${dir}">
    <header class="print-header">
      <div class="print-header__brand">
        ${logoHtml}
        <div>
          <h1 class="print-header__name">${escapeHtml(data.tenant.name)}</h1>
          ${legalHtml}
          ${taxHtml}
        </div>
      </div>
      <div class="print-header__meta">
        <p class="print-header__title">${escapeHtml(data.title)}</p>
        <p class="print-header__date">${data.locale === 'fa-IR' ? 'تاریخ: ' : 'Date: '}${escapeHtml(generatedLabel)}</p>
      </div>
    </header>
    <table class="print-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <footer class="print-footer">
      <span>${escapeHtml(data.tenant.name)}</span>
      <span>${escapeHtml(generatedLabel)}</span>
    </footer>
  </div>
</body>
</html>`;
}

/** Formats ISO date cell values for print/PDF when locale is fa-IR. */
export function formatPrintDateCell(value: string, locale: ExportLocaleDto): string {
  if (!value || value === '—') {
    return value;
  }

  const isoPrefix = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix)) {
    return value;
  }

  if (locale === 'fa-IR') {
    return formatIsoDateAsJalali(isoPrefix);
  }

  return isoPrefix;
}
