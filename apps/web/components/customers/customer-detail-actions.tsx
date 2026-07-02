'use client';

import type { StaffListItemDto, StaffListResponseDto } from '@hivork/contracts/core';
import type { TenantCustomerDetailResponseDto, TenantCustomerListItemDto } from '@hivork/contracts/customers';
import { Button, Input, Label, Textarea } from '@hivork/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { usePermission } from '@/hooks/use-permission';
import { apiFetch } from '@/lib/api/client';
import { useCustomerMutations } from '@/lib/api/customers';
import { maskPhone } from '@/lib/auth/phone-utils';

type CustomerDetailActionsProps = {
  customerId: string;
  detail: TenantCustomerDetailResponseDto;
  onToast?: (message: string) => void;
  onDetailChanged?: () => void;
};

type DialogKind =
  | 'archive'
  | 'unarchive'
  | 'delete'
  | 'blacklist'
  | 'unblacklist'
  | 'transfer'
  | 'merge'
  | null;

export function CustomerDetailActions({
  customerId,
  detail,
  onToast,
  onDetailChanged,
}: CustomerDetailActionsProps) {
  const router = useRouter();
  const { resolve } = useApiError();
  const menuId = useId();
  const menuRef = useRef<HTMLDetailsElement>(null);

  const canUpdate = usePermission('installments.customer.update');
  const canDelete = usePermission('installments.customer.delete');
  const canArchive = usePermission('installments.customer.archive');
  const canMerge = usePermission('installments.customer.merge');
  const canTransfer = usePermission('installments.customer.transfer');
  const canBlacklist = usePermission('installments.customer.blacklist');
  const canCreateSale = usePermission('installments.sale.create');
  const canExport = usePermission('installments.customer.export');

  const mutations = useCustomerMutations(customerId);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [reason, setReason] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffListItemDto[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<TenantCustomerListItemDto | null>(null);
  const [mergeSearch, setMergeSearch] = useState('');
  const [mergeResults, setMergeResults] = useState<TenantCustomerListItemDto[]>([]);
  const [mergeSearching, setMergeSearching] = useState(false);

  const isBlacklisted = Boolean(detail.isBlacklisted || detail.linkStatus === 'blacklisted');
  const isArchived = detail.linkStatus === 'archived';

  const closeDialog = useCallback(() => {
    setDialog(null);
    setReason('');
    setSelectedStaffId('');
    setMergeTarget(null);
    setMergeSearch('');
    setMergeResults([]);
  }, []);

  const closeMenu = useCallback(() => {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }, []);

  const notify = useCallback(
    (message: string) => {
      onToast?.(message);
    },
    [onToast],
  );

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const response = await apiFetch<StaffListResponseDto>('/staff?limit=50&sort=name:asc');
      setStaffOptions(response.data.filter((staff) => staff.status === 'active'));
    } catch (err) {
      notify(resolve(err));
      setStaffOptions([]);
    } finally {
      setStaffLoading(false);
    }
  }, [notify, resolve]);

  useEffect(() => {
    if (dialog !== 'transfer') {
      return;
    }
    void loadStaff();
  }, [dialog, loadStaff]);

  useEffect(() => {
    if (dialog !== 'merge') {
      return;
    }

    const timer = window.setTimeout(async () => {
      setMergeSearching(true);
      try {
        const params = new URLSearchParams({ limit: '10', sort: 'name:asc' });
        if (mergeSearch.trim()) {
          params.set('search', mergeSearch.trim());
        }
        const response = await apiFetch<{ data: TenantCustomerListItemDto[] }>(
          `/customers?${params.toString()}`,
        );
        setMergeResults(response.data.filter((item) => item.id !== customerId));
      } catch {
        setMergeResults([]);
      } finally {
        setMergeSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [customerId, dialog, mergeSearch]);

  const handleConfirm = useCallback(async () => {
    try {
      switch (dialog) {
        case 'archive':
          await mutations.archive.mutateAsync();
          notify('مشتری بایگانی شد.');
          onDetailChanged?.();
          closeDialog();
          break;
        case 'unarchive':
          await mutations.unarchive.mutateAsync();
          notify('مشتری از بایگانی خارج شد.');
          onDetailChanged?.();
          closeDialog();
          break;
        case 'delete':
          await mutations.deleteCustomer.mutateAsync(reason.trim() || undefined);
          notify('مشتری حذف شد.');
          closeDialog();
          router.push('/admin/customers');
          break;
        case 'blacklist':
          await mutations.blacklist.mutateAsync({ reason: reason.trim() });
          notify('مشتری به بلک‌لیست اضافه شد.');
          onDetailChanged?.();
          closeDialog();
          break;
        case 'unblacklist':
          await mutations.unblacklist.mutateAsync();
          notify('مشتری از بلک‌لیست خارج شد.');
          onDetailChanged?.();
          closeDialog();
          break;
        case 'transfer':
          await mutations.transfer.mutateAsync({
            newStaffId: selectedStaffId,
            note: reason.trim() || undefined,
          });
          notify('مسئولیت مشتری منتقل شد.');
          onDetailChanged?.();
          closeDialog();
          break;
        case 'merge':
          if (!mergeTarget) {
            return;
          }
          await mutations.merge.mutateAsync({
            body: {
              sourceTenantCustomerId: customerId,
              targetTenantCustomerId: mergeTarget.id,
              reason: reason.trim(),
            },
            idempotencyKey: crypto.randomUUID(),
          });
          notify('مشتریان ادغام شدند.');
          closeDialog();
          router.push(`/admin/customers/${mergeTarget.id}`);
          break;
        default:
          break;
      }
    } catch (err) {
      notify(resolve(err));
    }
  }, [
    closeDialog,
    customerId,
    dialog,
    mergeTarget,
    mutations,
    notify,
    onDetailChanged,
    reason,
    resolve,
    router,
    selectedStaffId,
  ]);

  const isPending =
    mutations.archive.isPending ||
    mutations.unarchive.isPending ||
    mutations.deleteCustomer.isPending ||
    mutations.blacklist.isPending ||
    mutations.unblacklist.isPending ||
    mutations.transfer.isPending ||
    mutations.merge.isPending;

  const dialogConfig = getDialogConfig(dialog, {
    detail,
    reason,
    selectedStaffId,
    mergeTarget,
    isPending,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canCreateSale ? (
        <Button asChild size="sm" disabled={isBlacklisted}>
          <Link href={`/admin/sales/new?customerId=${customerId}`}>ثبت فروش</Link>
        </Button>
      ) : null}

      {canUpdate ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/customers/${customerId}/edit`}>ویرایش</Link>
        </Button>
      ) : null}

      {canExport ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/customers?search=${encodeURIComponent(detail.globalCustomer.phone)}`}>
            خروجی
          </Link>
        </Button>
      ) : null}

      <details ref={menuRef} className="relative">
        <summary
          className="inline-flex cursor-pointer list-none items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          aria-haspopup="menu"
          aria-controls={menuId}
        >
          عملیات بیشتر
        </summary>
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 z-20 mt-1 min-w-[12rem] rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          {canArchive && !isArchived ? (
            <MenuButton
              label="بایگانی"
              onClick={() => {
                closeMenu();
                setDialog('archive');
              }}
            />
          ) : null}
          {canArchive && isArchived ? (
            <MenuButton
              label="خروج از بایگانی"
              onClick={() => {
                closeMenu();
                setDialog('unarchive');
              }}
            />
          ) : null}
          {canTransfer ? (
            <MenuButton
              label="انتقال مسئولیت"
              onClick={() => {
                closeMenu();
                setDialog('transfer');
              }}
            />
          ) : null}
          {canMerge ? (
            <MenuButton
              label="ادغام مشتری"
              onClick={() => {
                closeMenu();
                setDialog('merge');
              }}
            />
          ) : null}
          {canBlacklist && !isBlacklisted ? (
            <MenuButton
              label="بلک‌لیست"
              destructive
              onClick={() => {
                closeMenu();
                setDialog('blacklist');
              }}
            />
          ) : null}
          {canBlacklist && isBlacklisted ? (
            <MenuButton
              label="خروج از بلک‌لیست"
              onClick={() => {
                closeMenu();
                setDialog('unblacklist');
              }}
            />
          ) : null}
          {canDelete ? (
            <MenuButton
              label="حذف"
              destructive
              onClick={() => {
                closeMenu();
                setDialog('delete');
              }}
            />
          ) : null}
        </div>
      </details>

      {dialog && dialogConfig ? (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          aria-labelledby="customer-action-dialog-title"
        >
          <div className="w-full max-w-lg rounded-xl bg-card p-5 shadow-lg">
            <h2 id="customer-action-dialog-title" className="text-lg font-semibold text-foreground">
              {dialogConfig.title}
            </h2>
            {dialogConfig.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{dialogConfig.description}</p>
            ) : null}

            {dialog === 'transfer' ? (
              <div className="mt-4 flex flex-col gap-2">
                <Label htmlFor="transfer-staff">کارمند جدید</Label>
                <select
                  id="transfer-staff"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={selectedStaffId}
                  onChange={(event) => setSelectedStaffId(event.target.value)}
                  disabled={staffLoading || isPending}
                >
                  <option value="">انتخاب کنید…</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {dialog === 'merge' ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="merge-search">مشتری مقصد</Label>
                  <Input
                    id="merge-search"
                    value={mergeSearch}
                    onChange={(event) => setMergeSearch(event.target.value)}
                    placeholder="جستجو با نام یا شماره…"
                    disabled={isPending}
                  />
                </div>
                {mergeSearching ? (
                  <p className="text-xs text-muted-foreground">در حال جستجو…</p>
                ) : null}
                <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
                  {mergeResults.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-start text-sm hover:bg-muted ${
                          mergeTarget?.id === item.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => setMergeTarget(item)}
                      >
                        {item.globalCustomer.name?.trim() || 'بدون نام'} (
                        {maskPhone(item.globalCustomer.phone)})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {dialogConfig.showReason ? (
              <div className="mt-4 flex flex-col gap-2">
                <Label htmlFor="action-reason">
                  {dialog === 'transfer' ? 'یادداشت (اختیاری)' : 'دلیل'}
                </Label>
                <Textarea
                  id="action-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  disabled={isPending}
                  required={dialogConfig.reasonRequired}
                />
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="button"
                variant={dialogConfig.destructive ? 'destructive' : 'default'}
                disabled={!dialogConfig.canConfirm || isPending}
                onClick={() => void handleConfirm()}
              >
                {isPending ? 'در حال انجام…' : dialogConfig.confirmLabel}
              </Button>
              <Button type="button" variant="outline" disabled={isPending} onClick={closeDialog}>
                انصراف
              </Button>
            </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}

function MenuButton({
  label,
  onClick,
  destructive = false,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`block w-full rounded-md px-3 py-2 text-start text-sm hover:bg-muted ${
        destructive ? 'text-destructive' : 'text-foreground'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function getDialogConfig(
  dialog: DialogKind,
  ctx: {
    detail: TenantCustomerDetailResponseDto;
    reason: string;
    selectedStaffId: string;
    mergeTarget: TenantCustomerListItemDto | null;
    isPending: boolean;
  },
) {
  if (!dialog) {
    return null;
  }

  const name = ctx.detail.globalCustomer.name?.trim() || 'مشتری';

  const configs: Record<
    Exclude<DialogKind, null>,
    {
      title: string;
      description?: string;
      confirmLabel: string;
      destructive?: boolean;
      showReason?: boolean;
      reasonRequired?: boolean;
      canConfirm: boolean;
    }
  > = {
    archive: {
      title: 'بایگانی مشتری',
      description: `«${name}» بایگانی می‌شود و در لیست پیش‌فرض نمایش داده نمی‌شود.`,
      confirmLabel: 'بایگانی',
      canConfirm: true,
    },
    unarchive: {
      title: 'خروج از بایگانی',
      description: `«${name}» دوباره در لیست فعال نمایش داده می‌شود.`,
      confirmLabel: 'تأیید',
      canConfirm: true,
    },
    delete: {
      title: 'حذف مشتری',
      description: `«${name}» حذف نرم می‌شود و از لیست عادی پنهان می‌گردد.`,
      confirmLabel: 'حذف',
      destructive: true,
      showReason: true,
      reasonRequired: false,
      canConfirm: true,
    },
    blacklist: {
      title: 'بلک‌لیست مشتری',
      description: 'ثبت فروش جدید برای این مشتری مسدود می‌شود.',
      confirmLabel: 'بلک‌لیست',
      destructive: true,
      showReason: true,
      reasonRequired: ctx.reason.trim().length >= 3,
      canConfirm: ctx.reason.trim().length >= 3,
    },
    unblacklist: {
      title: 'خروج از بلک‌لیست',
      description: 'مشتری می‌تواند دوباره فروش جدید داشته باشد.',
      confirmLabel: 'تأیید',
      canConfirm: true,
    },
    transfer: {
      title: 'انتقال مسئولیت',
      description: 'مسئولیت پیگیری این مشتری به کارمند دیگر منتقل می‌شود.',
      confirmLabel: 'انتقال',
      showReason: true,
      reasonRequired: false,
      canConfirm: Boolean(ctx.selectedStaffId),
    },
    merge: {
      title: 'ادغام مشتری',
      description: 'اطلاعات این مشتری (مبدأ) به مشتری مقصد منتقل می‌شود.',
      confirmLabel: 'ادغام',
      destructive: true,
      showReason: true,
      reasonRequired: ctx.reason.trim().length >= 3,
      canConfirm: Boolean(ctx.mergeTarget) && ctx.reason.trim().length >= 3,
    },
  };

  return configs[dialog];
}
