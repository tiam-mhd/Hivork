'use client';

import type {
  CollateralDto,
  ContractAttachmentDto,
  ContractVersionDto,
  GuarantorDto,
  SaleDetailEnterpriseDto,
  SaleLineItemDto,
} from '@hivork/contracts/installments';
import { formatIsoDateAsJalali, formatPersianDigits, formatToman } from '@hivork/i18n';
import { Button, Card, CardContent } from '@hivork/ui';
import { useEffect, useMemo, useState } from 'react';

import {
  fetchSaleAttachments,
  fetchSaleCollaterals,
  fetchSaleGuarantors,
  fetchSaleLineItems,
  fetchSaleVersions,
} from '@/lib/api/sale-detail';

type ContractDetailTabId =
  | 'summary'
  | 'installments'
  | 'items'
  | 'guarantors'
  | 'collaterals'
  | 'attachments'
  | 'versions'
  | 'activity';

type ContractDetailTabsProps = {
  sale: SaleDetailEnterpriseDto;
  canEdit: boolean;
};

type AsyncTabState<T> = {
  loading: boolean;
  error: string | null;
  loaded: boolean;
  data: T;
};

const TABS: Array<{ id: ContractDetailTabId; label: string }> = [
  { id: 'summary', label: 'خلاصه' },
  { id: 'installments', label: 'اقساط' },
  { id: 'items', label: 'اقلام' },
  { id: 'guarantors', label: 'ضامنین' },
  { id: 'collaterals', label: 'وثیقه' },
  { id: 'attachments', label: 'پیوست‌ها' },
  { id: 'versions', label: 'نسخه‌ها' },
  { id: 'activity', label: 'تاریخچه' },
];

function createAsyncState<T>(data: T): AsyncTabState<T> {
  return { loading: false, error: null, loaded: false, data };
}

function EmptyTabState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function LoadingTabState({ label }: { label: string }) {
  return (
    <div
      className="rounded-xl border border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground"
      aria-busy="true"
    >
      در حال بارگذاری {label}...
    </div>
  );
}

function ErrorTabState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
      <p className="text-sm font-medium text-destructive">خطا در بارگذاری اطلاعات</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
        تلاش مجدد
      </Button>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/10 p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function renderNullableDate(value: string | null | undefined) {
  return value ? formatIsoDateAsJalali(value.slice(0, 10)) : '—';
}

function renderNullableMoney(value: string | null | undefined) {
  return value ? formatToman(BigInt(value)) : '—';
}

function GuarantorRelationshipLabel({ value }: { value: GuarantorDto['relationship'] }) {
  const labels: Record<GuarantorDto['relationship'], string> = {
    parent: 'والد',
    spouse: 'همسر',
    sibling: 'خواهر/برادر',
    employer: 'کارفرما',
    other: 'سایر',
  };
  return <>{labels[value]}</>;
}

function CollateralStatusLabel({ value }: { value: CollateralDto['status'] }) {
  const labels: Record<CollateralDto['status'], string> = {
    pledged: 'در وثیقه',
    released: 'آزادشده',
    forfeited: 'تملک‌شده',
  };
  return <>{labels[value]}</>;
}

function CollateralTypeLabel({ value }: { value: CollateralDto['collateralType'] }) {
  const labels: Record<CollateralDto['collateralType'], string> = {
    cheque: 'چک',
    promissory_note: 'سفته',
    gold: 'طلا',
    vehicle: 'خودرو',
    property: 'ملک',
    cash_deposit: 'سپرده نقدی',
    other: 'سایر',
  };
  return <>{labels[value]}</>;
}

export function ContractDetailTabs({ sale, canEdit }: ContractDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<ContractDetailTabId>('summary');
  const [lineItems, setLineItems] = useState(createAsyncState<SaleLineItemDto[]>([]));
  const [guarantors, setGuarantors] = useState(createAsyncState<GuarantorDto[]>([]));
  const [collaterals, setCollaterals] = useState(createAsyncState<CollateralDto[]>([]));
  const [attachments, setAttachments] = useState<AsyncTabState<ContractAttachmentDto[]>>(
    createAsyncState(sale.attachments ?? []),
  );
  const [versions, setVersions] = useState<AsyncTabState<ContractVersionDto[]>>(
    createAsyncState((sale.versions ?? []).map((item) => ({ ...item, saleId: sale.id }))),
  );

  const isArchived = sale.status === 'archived' || Boolean(sale.archivedAt);

  async function loadLineItems() {
    setLineItems((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchSaleLineItems(sale.id);
      setLineItems({ loading: false, error: null, loaded: true, data: response.data });
    } catch (error) {
      setLineItems((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'خطای نامشخص',
      }));
    }
  }

  async function loadGuarantors() {
    setGuarantors((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchSaleGuarantors(sale.id);
      setGuarantors({ loading: false, error: null, loaded: true, data: response.data });
    } catch (error) {
      setGuarantors((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'خطای نامشخص',
      }));
    }
  }

  async function loadCollaterals() {
    setCollaterals((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchSaleCollaterals(sale.id);
      setCollaterals({ loading: false, error: null, loaded: true, data: response.data });
    } catch (error) {
      setCollaterals((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'خطای نامشخص',
      }));
    }
  }

  async function loadAttachments() {
    setAttachments((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchSaleAttachments(sale.id);
      setAttachments({ loading: false, error: null, loaded: true, data: response.data });
    } catch (error) {
      setAttachments((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'خطای نامشخص',
      }));
    }
  }

  async function loadVersions() {
    setVersions((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchSaleVersions(sale.id);
      setVersions({ loading: false, error: null, loaded: true, data: response.data });
    } catch (error) {
      setVersions((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'خطای نامشخص',
      }));
    }
  }

  useEffect(() => {
    if (activeTab === 'items' && !lineItems.loaded && !lineItems.loading) {
      void loadLineItems();
    }
    if (activeTab === 'guarantors' && !guarantors.loaded && !guarantors.loading) {
      void loadGuarantors();
    }
    if (activeTab === 'collaterals' && !collaterals.loaded && !collaterals.loading) {
      void loadCollaterals();
    }
    if (activeTab === 'attachments' && !attachments.loaded && !attachments.loading) {
      void loadAttachments();
    }
    if (activeTab === 'versions' && !versions.loaded && !versions.loading) {
      void loadVersions();
    }
  }, [activeTab, attachments.loaded, attachments.loading, collaterals.loaded, collaterals.loading, guarantors.loaded, guarantors.loading, lineItems.loaded, lineItems.loading, versions.loaded, versions.loading]);

  useEffect(() => {
    setAttachments({
      loading: false,
      error: null,
      loaded: Boolean(sale.attachments),
      data: sale.attachments ?? [],
    });
    setVersions({
      loading: false,
      error: null,
      loaded: Boolean(sale.versions),
      data: (sale.versions ?? []).map((item) => ({ ...item, saleId: sale.id })),
    });
  }, [sale.attachments, sale.id, sale.versions]);

  const tabsLabel = useMemo(
    () => `${sale.contractNumber ?? sale.title ?? 'قرارداد'} - تب‌های جزئیات قرارداد`,
    [sale.contractNumber, sale.title],
  );

  return (
    <div className="flex flex-col gap-4">
      {isArchived ? (
        <div className="rounded-xl border border-banner-trial-border bg-banner-trial px-4 py-3 text-sm text-banner-trial-foreground">
          این قرارداد بایگانی شده و در حالت فقط‌خواندنی نمایش داده می‌شود.
        </div>
      ) : null}

      <div className="md:hidden">
        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="contract-detail-tab-select">
          بخش قرارداد
        </label>
        <select
          id="contract-detail-tab-select"
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as ContractDetailTabId)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="hidden gap-2 overflow-x-auto border-b border-border pb-px md:flex"
        role="tablist"
        aria-label={tabsLabel}
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`contract-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`contract-tab-panel-${tab.id}`}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={`contract-tab-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`contract-tab-${activeTab}`}
        className="flex flex-col gap-4"
      >
        {activeTab === 'summary' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card/80 shadow-sm">
              <CardContent className="p-5">
                <h3 className="mb-4 text-base font-semibold text-foreground">اطلاعات قرارداد</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryItem label="شماره قرارداد" value={sale.contractNumber ?? '—'} />
                  <SummaryItem label="وضعیت امضا" value={sale.signatureStatus} />
                  <SummaryItem label="تاریخ امضا" value={renderNullableDate(sale.signedAt)} />
                  <SummaryItem label="تاریخ بایگانی" value={renderNullableDate(sale.archivedAt)} />
                  <SummaryItem label="تمدید از قرارداد" value={sale.extendedFromSaleId ?? '—'} />
                  <SummaryItem label="کپی از قرارداد" value={sale.copiedFromSaleId ?? '—'} />
                </div>
                {sale.customTerms ? (
                  <div className="mt-4 rounded-lg border border-border/70 bg-muted/10 p-4">
                    <div className="text-xs font-medium text-muted-foreground">شرایط اختصاصی</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{sale.customTerms}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/80 shadow-sm">
              <CardContent className="p-5">
                <h3 className="mb-4 text-base font-semibold text-foreground">مالی و بیمه</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryItem label="مالیات" value={renderNullableMoney(sale.taxRial ?? null)} />
                  <SummaryItem label="نرخ مالیات" value={sale.taxRateBps !== null ? `${formatPersianDigits(sale.taxRateBps)} bps` : '—'} />
                  <SummaryItem label="مالیات در مبلغ" value={sale.taxInclusive ? 'بله' : 'خیر'} />
                  <SummaryItem label="بیمه" value={renderNullableMoney(sale.insuranceRial)} />
                  <SummaryItem label="بیمه‌گر" value={sale.insuranceProvider ?? '—'} />
                  <SummaryItem label="شماره بیمه‌نامه" value={sale.insurancePolicyNumber ?? '—'} />
                  <SummaryItem label="انقضای بیمه" value={renderNullableDate(sale.insuranceExpiresAt)} />
                  <SummaryItem label="هشدار انقضا" value={sale.insuranceExpiredWarning ? 'فعال' : 'ندارد'} />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === 'installments' ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-start text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">قسط</th>
                    <th className="px-4 py-3">مبلغ</th>
                    <th className="px-4 py-3">سررسید</th>
                    <th className="px-4 py-3">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sale.installments]
                    .sort((left, right) => left.sequenceNumber - right.sequenceNumber)
                    .map((installment, index) => (
                      <tr key={installment.id} className={index % 2 ? 'bg-muted/10' : ''}>
                        <td className="px-4 py-3">{formatPersianDigits(installment.sequenceNumber)}</td>
                        <td className="px-4 py-3">{formatToman(BigInt(installment.amountRial))}</td>
                        <td className="px-4 py-3">{formatIsoDateAsJalali(installment.dueDate.slice(0, 10))}</td>
                        <td className="px-4 py-3">{installment.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeTab === 'items' ? (
          lineItems.loading ? (
            <LoadingTabState label="اقلام" />
          ) : lineItems.error ? (
            <ErrorTabState message={lineItems.error} onRetry={() => void loadLineItems()} />
          ) : lineItems.data.length === 0 ? (
            <EmptyTabState title="قلمی ثبت نشده است" description="برای این قرارداد هنوز اقلام فروش ثبت نشده‌اند." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">اقلام قرارداد</h3>
                  <p className="text-xs text-muted-foreground">
                    {canEdit && !isArchived ? 'ویرایش اقلام در فاز بعدی فعال می‌شود.' : 'نمایش فقط‌خواندنی'}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[48rem] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-start text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-3">عنوان</th>
                      <th className="px-4 py-3">تعداد</th>
                      <th className="px-4 py-3">قیمت واحد</th>
                      <th className="px-4 py-3">تخفیف</th>
                      <th className="px-4 py-3">مالیات</th>
                      <th className="px-4 py-3">جمع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.data.map((item, index) => (
                      <tr key={item.id} className={index % 2 ? 'bg-muted/10' : ''}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.title}</div>
                          {item.sku ? <div className="text-xs text-muted-foreground">{item.sku}</div> : null}
                        </td>
                        <td className="px-4 py-3">{formatPersianDigits(item.quantity)}</td>
                        <td className="px-4 py-3">{formatToman(BigInt(item.unitPriceRial))}</td>
                        <td className="px-4 py-3">{formatToman(BigInt(item.discountRial))}</td>
                        <td className="px-4 py-3">{formatToman(BigInt(item.taxRial))}</td>
                        <td className="px-4 py-3 font-medium">{formatToman(BigInt(item.lineTotalRial))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : null}

        {activeTab === 'guarantors' ? (
          guarantors.loading ? (
            <LoadingTabState label="ضامنین" />
          ) : guarantors.error ? (
            <ErrorTabState message={guarantors.error} onRetry={() => void loadGuarantors()} />
          ) : guarantors.data.length === 0 ? (
            <EmptyTabState title="ضامنی ثبت نشده است" description="برای این قرارداد ضامنی ثبت نشده است." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-start text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-3">نام</th>
                      <th className="px-4 py-3">موبایل</th>
                      <th className="px-4 py-3">کد ملی</th>
                      <th className="px-4 py-3">نسبت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guarantors.data.map((item, index) => (
                      <tr key={item.id} className={index % 2 ? 'bg-muted/10' : ''}>
                        <td className="px-4 py-3">{item.fullName ?? '—'}</td>
                        <td className="px-4 py-3">{item.phone ?? '—'}</td>
                        <td className="px-4 py-3">{item.nationalId ?? '—'}</td>
                        <td className="px-4 py-3"><GuarantorRelationshipLabel value={item.relationship} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : null}

        {activeTab === 'collaterals' ? (
          collaterals.loading ? (
            <LoadingTabState label="وثیقه‌ها" />
          ) : collaterals.error ? (
            <ErrorTabState message={collaterals.error} onRetry={() => void loadCollaterals()} />
          ) : collaterals.data.length === 0 ? (
            <EmptyTabState title="وثیقه‌ای ثبت نشده است" description="برای این قرارداد وثیقه‌ای ثبت نشده است." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {collaterals.data.map((item) => (
                <Card key={item.id} className="border-border bg-card/80 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <CollateralStatusLabel value={item.status} />
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <p><span className="text-muted-foreground">نوع:</span> <CollateralTypeLabel value={item.collateralType} /></p>
                      <p><span className="text-muted-foreground">ارزش تقریبی:</span> {formatToman(BigInt(item.estimatedValueRial))}</p>
                      <p><span className="text-muted-foreground">شماره ثبت:</span> {item.registrationNumber ?? '—'}</p>
                      <p><span className="text-muted-foreground">تاریخ صدور:</span> {renderNullableDate(item.issuedAt)}</p>
                      {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : null}

        {activeTab === 'attachments' ? (
          attachments.loading ? (
            <LoadingTabState label="پیوست‌ها" />
          ) : attachments.error ? (
            <ErrorTabState message={attachments.error} onRetry={() => void loadAttachments()} />
          ) : attachments.data.length === 0 ? (
            <EmptyTabState title="پیوستی ثبت نشده است" description="برای این قرارداد هنوز پیوستی بارگذاری نشده است." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {attachments.data.map((item) => (
                <Card key={item.id} className="border-border bg-card/80 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{item.label ?? 'پیوست قرارداد'}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{item.attachmentType}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        فایل ثبت‌شده
                      </span>
                    </div>
                    {item.description ? (
                      <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">شناسه فایل: {item.fileId}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : null}

        {activeTab === 'versions' ? (
          versions.loading ? (
            <LoadingTabState label="نسخه‌ها" />
          ) : versions.error ? (
            <ErrorTabState message={versions.error} onRetry={() => void loadVersions()} />
          ) : versions.data.length === 0 ? (
            <EmptyTabState title="نسخه‌ای ثبت نشده است" description="برای این قرارداد نسخه‌ای در دسترس نیست." />
          ) : (
            <div className="space-y-3">
              {versions.data.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        نسخه {formatPersianDigits(item.versionNumber)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatIsoDateAsJalali(item.createdAt.slice(0, 10))}
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {item.changeType}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-foreground/90">{item.changeReason}</p>
                </div>
              ))}
            </div>
          )
        ) : null}

        {activeTab === 'activity' ? (
          <EmptyTabState
            title="تاریخچه فعالیت"
            description="فید فعالیت قرارداد در این فاز به‌صورت فقط‌خواندنی کامل می‌شود."
          />
        ) : null}
      </div>
    </div>
  );
}
