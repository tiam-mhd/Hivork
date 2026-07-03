import { formatJalaliDate } from '@hivork/i18n';
import { maskPhoneForDisplay } from '@hivork/contracts';

import type { TenantBrandingDto } from '@hivork/contracts/core';
import { formatRialAsTomanDisplay } from '../../core/export/export-money.js';

function escapePrintHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export type PaymentReceiptLayoutData = {
  tenant: TenantBrandingDto;
  receiptNumber: string;
  confirmedAt: Date;
  customerName: string;
  customerPhoneMasked: string;
  contractReference: string;
  installmentSequence: number;
  installmentAmountRial: bigint;
  paymentAmountRial: bigint;
  paymentMethodLabel: string;
  paymentMethodDetails: string | null;
  confirmedByStaffName: string | null;
  note: string | null;
};

const RECEIPT_STYLES = `
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
  font-size: 12px;
  color: #111;
}
.receipt { direction: rtl; padding: 8px; }
.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  border-bottom: 2px solid #1a1a1a;
  padding-bottom: 12px;
  margin-bottom: 20px;
}
.receipt-header__brand { display: flex; gap: 12px; align-items: center; }
.receipt-header__logo { max-height: 56px; max-width: 140px; object-fit: contain; }
.receipt-header__name { font-size: 18px; font-weight: 700; margin: 0; }
.receipt-header__legal { font-size: 11px; color: #444; margin: 4px 0 0; }
.receipt-title { font-size: 16px; font-weight: 700; margin: 0 0 4px; text-align: end; }
.receipt-meta { font-size: 11px; color: #555; margin: 0; text-align: end; }
.receipt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 24px;
  margin-bottom: 20px;
}
.receipt-field__label { font-size: 10px; color: #666; margin: 0 0 2px; }
.receipt-field__value { font-size: 13px; font-weight: 600; margin: 0; }
.receipt-amount {
  border: 2px solid #1a1a1a;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  margin: 24px 0;
}
.receipt-amount__label { font-size: 12px; color: #444; margin: 0 0 8px; }
.receipt-amount__value { font-size: 22px; font-weight: 700; margin: 0; }
.receipt-footer {
  margin-top: 32px;
  padding-top: 12px;
  border-top: 1px solid #ddd;
  font-size: 10px;
  color: #666;
  text-align: center;
}
`;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقدی',
  bank_transfer: 'انتقال بانکی',
  online: 'پرداخت آنلاین',
  pos: 'کارتخوان (POS)',
  check: 'چک',
  fee: 'کارمزد',
  manual: 'دستی',
};

export function resolvePaymentMethodLabel(method: string | undefined): string {
  if (!method) {
    return 'نامشخص';
  }

  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function buildPaymentMethodDetails(
  method: string | undefined,
  metadata: Record<string, unknown> | null,
): string | null {
  if (!metadata) {
    return null;
  }

  switch (method) {
    case 'bank_transfer':
      return metadata.bankName ? `بانک: ${String(metadata.bankName)}` : null;
    case 'pos':
      return metadata.posTerminalId ? `ترمینال: ${String(metadata.posTerminalId)}` : null;
    case 'check':
      return metadata.checkId ? `شناسه چک: ${String(metadata.checkId)}` : null;
    default:
      return null;
  }
}

export function renderPaymentReceiptHtml(data: PaymentReceiptLayoutData): string {
  const logoHtml = data.tenant.logoUrl
    ? `<img class="receipt-header__logo" src="${escapePrintHtml(data.tenant.logoUrl)}" alt="" />`
    : '';

  const legalHtml = data.tenant.legalName
    ? `<p class="receipt-header__legal">${escapePrintHtml(data.tenant.legalName)}</p>`
    : '';

  const methodDetailsHtml = data.paymentMethodDetails
    ? `<p class="receipt-field__value">${escapePrintHtml(data.paymentMethodDetails)}</p>`
    : '';

  const noteHtml = data.note
    ? `<div class="receipt-field">
        <p class="receipt-field__label">یادداشت</p>
        <p class="receipt-field__value">${escapePrintHtml(data.note)}</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fa">
<head>
  <meta charset="utf-8" />
  <title>رسید پرداخت ${escapePrintHtml(data.receiptNumber)}</title>
  <style>${RECEIPT_STYLES}</style>
</head>
<body>
  <div class="receipt">
    <header class="receipt-header">
      <div class="receipt-header__brand">
        ${logoHtml}
        <div>
          <h1 class="receipt-header__name">${escapePrintHtml(data.tenant.name)}</h1>
          ${legalHtml}
        </div>
      </div>
      <div>
        <p class="receipt-title">رسید پرداخت</p>
        <p class="receipt-meta">شماره: ${escapePrintHtml(data.receiptNumber)}</p>
        <p class="receipt-meta">تاریخ: ${escapePrintHtml(formatJalaliDate(data.confirmedAt))}</p>
      </div>
    </header>

    <div class="receipt-grid">
      <div class="receipt-field">
        <p class="receipt-field__label">مشتری</p>
        <p class="receipt-field__value">${escapePrintHtml(data.customerName)}</p>
      </div>
      <div class="receipt-field">
        <p class="receipt-field__label">شماره تماس</p>
        <p class="receipt-field__value">${escapePrintHtml(data.customerPhoneMasked)}</p>
      </div>
      <div class="receipt-field">
        <p class="receipt-field__label">قرارداد / فروش</p>
        <p class="receipt-field__value">${escapePrintHtml(data.contractReference)}</p>
      </div>
      <div class="receipt-field">
        <p class="receipt-field__label">قسط</p>
        <p class="receipt-field__value">قسط ${data.installmentSequence} — ${escapePrintHtml(formatRialAsTomanDisplay(data.installmentAmountRial))}</p>
      </div>
      <div class="receipt-field">
        <p class="receipt-field__label">روش پرداخت</p>
        <p class="receipt-field__value">${escapePrintHtml(data.paymentMethodLabel)}</p>
        ${methodDetailsHtml}
      </div>
      <div class="receipt-field">
        <p class="receipt-field__label">تأییدکننده</p>
        <p class="receipt-field__value">${escapePrintHtml(data.confirmedByStaffName ?? '—')}</p>
      </div>
      ${noteHtml}
    </div>

    <div class="receipt-amount">
      <p class="receipt-amount__label">مبلغ دریافت‌شده</p>
      <p class="receipt-amount__value">${escapePrintHtml(formatRialAsTomanDisplay(data.paymentAmountRial))}</p>
    </div>

    <footer class="receipt-footer">
      این رسید به‌صورت الکترونیکی صادر شده و فاقد مهر و امضای فیزیکی است.
    </footer>
  </div>
</body>
</html>`;
}

export function maskCustomerPhoneForReceipt(phone: string): string {
  try {
    return maskPhoneForDisplay(phone);
  } catch {
    return '—';
  }
}
