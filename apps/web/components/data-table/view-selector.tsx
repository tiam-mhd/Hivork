'use client';

import type { CreateSavedViewDto, SavedFilterItemDto, SavedViewItemDto, SavedViewResourceKeyDto } from '@hivork/contracts/core';
import type { ColumnPersonalization, DataTableSortDir, FilterAst } from '@hivork/contracts/ui';
import { Button, Input, Label, Textarea } from '@hivork/ui';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { useAnyPermission } from '@/hooks/use-permission';
import { useSavedViews } from '@/hooks/use-saved-views';
import { ApiClientError } from '@/lib/api/client';

type ViewSelectorProps = {
  resourceKey: SavedViewResourceKeyDto;
  activeViewId: string | null;
  columnState: ColumnPersonalization;
  sortBy?: string;
  sortDir?: DataTableSortDir;
  search: string;
  filterAst: FilterAst | null;
  savedFilters: SavedFilterItemDto[];
  onSelectView: (view: SavedViewItemDto) => void;
  onToast?: (message: string) => void;
  disabled?: boolean;
};

function resolveSavedFilterId(
  filterAst: FilterAst | null,
  savedFilters: SavedFilterItemDto[],
): string | undefined {
  if (!filterAst) {
    return undefined;
  }

  const serialized = JSON.stringify(filterAst);
  const match = savedFilters.find((item) => JSON.stringify(item.filterAst) === serialized);
  return match?.id;
}

export function ViewSelector({
  resourceKey,
  activeViewId,
  columnState,
  sortBy,
  sortDir,
  search,
  filterAst,
  savedFilters,
  onSelectView,
  onToast,
  disabled = false,
}: ViewSelectorProps) {
  const menuId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SavedViewItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedViewItemDto | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    items,
    mine,
    shared,
    loading,
    forbidden,
    createSavedView,
    updateSavedView,
    setAsDefault,
    deleteSavedView,
    forkSavedView,
    isSaving,
    isDeleting,
  } = useSavedViews(resourceKey);
  const canManage = useAnyPermission(['core.saved_view.manage']);
  const canShare = useAnyPermission(['core.saved_view.share']);
  const canUseShared = useAnyPermission(['core.saved_view.use_shared']);

  const activeView = items.find((item) => item.id === activeViewId) ?? null;
  const triggerLabel = activeView?.name ?? 'نماها';

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSaveOpen(false);
        setManageOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const handleSave = useCallback(async () => {
    setFormError(null);

    if (!name.trim()) {
      setFormError('نام نما الزامی است.');
      return;
    }

    const payload: CreateSavedViewDto = {
      resourceKey,
      name: name.trim(),
      description: description.trim() || undefined,
      columnState,
      sortBy,
      sortDir,
      search: search.trim() || undefined,
      savedFilterId: resolveSavedFilterId(filterAst, savedFilters),
      isDefault,
    };

    try {
      const created = await createSavedView(payload);
      onSelectView(created);
      onToast?.(`نمای «${created.name}» ذخیره شد`);
      setSaveOpen(false);
      setOpen(false);
      setName('');
      setDescription('');
      setIsDefault(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'SAVED_VIEW_NAME_EXISTS') {
        setFormError('نمایی با این نام وجود دارد.');
        return;
      }
      setFormError(error instanceof Error ? error.message : 'خطا در ذخیره نما');
    }
  }, [
    columnState,
    createSavedView,
    description,
    filterAst,
    isDefault,
    name,
    onSelectView,
    onToast,
    resourceKey,
    savedFilters,
    search,
    sortBy,
    sortDir,
  ]);

  const handleRename = useCallback(async () => {
    if (!renameTarget || !name.trim()) {
      return;
    }

    try {
      await updateSavedView(renameTarget.id, {
        name: name.trim(),
        version: renameTarget.version,
      });
      onToast?.('نام نما به‌روزرسانی شد');
      setRenameTarget(null);
      setName('');
      setManageOpen(false);
      setOpen(false);
    } catch (error) {
      onToast?.(error instanceof Error ? error.message : 'خطا در تغییر نام');
    }
  }, [name, onToast, renameTarget, updateSavedView]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteSavedView(deleteTarget.id);
      onToast?.(`نمای «${deleteTarget.name}» حذف شد`);
      setDeleteTarget(null);
      setManageOpen(false);
      setOpen(false);
    } catch (error) {
      onToast?.(error instanceof Error ? error.message : 'خطا در حذف نما');
    }
  }, [deleteSavedView, deleteTarget, onToast]);

  if (forbidden) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 gap-1.5"
        disabled={disabled || loading}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="max-w-32 truncate">{triggerLabel}</span>
        {activeView?.isDefault ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            پیش‌فرض
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 z-40 mt-2 w-72 rounded-xl border border-border bg-popover p-2 shadow-lg"
        >
          {saveOpen ? (
            <div className="flex flex-col gap-3 p-1">
              <p className="text-sm font-medium">ذخیره نمای فعلی</p>
              <div className="space-y-1.5">
                <Label htmlFor={nameId}>نام نما</Label>
                <Input
                  id={nameId}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="مثلاً نمای مالی"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={descriptionId}>توضیح (اختیاری)</Label>
                <Textarea
                  id={descriptionId}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(event) => setIsDefault(event.target.checked)}
                />
                پیش‌فرض این لیست
              </label>
              {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => void handleSave()}
                >
                  {isSaving ? 'در حال ذخیره…' : 'ذخیره'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSaveOpen(false);
                    setFormError(null);
                  }}
                >
                  انصراف
                </Button>
              </div>
            </div>
          ) : manageOpen ? (
            <div className="flex flex-col gap-2 p-1">
              <p className="text-sm font-medium">مدیریت نماها</p>
              {mine.length === 0 ? (
                <p className="text-xs text-muted-foreground">نمایی ذخیره نشده است.</p>
              ) : (
                mine.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1.5"
                  >
                    <span className="truncate text-sm">
                      {item.name}
                      {item.visibility === 'shared' ? (
                        <span className="ms-2 text-[10px] text-muted-foreground">مشترک</span>
                      ) : null}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setRenameTarget(item);
                          setName(item.name);
                        }}
                      >
                        تغییر نام
                      </Button>
                      {!item.isDefault ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => void setAsDefault(item).then(() => onToast?.('نمای پیش‌فرض تنظیم شد'))}
                        >
                          پیش‌فرض
                        </Button>
                      ) : null}
                      {canShare ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            void updateSavedView(item.id, {
                              visibility: item.visibility === 'shared' ? 'private' : 'shared',
                              version: item.version,
                            }).then(() =>
                              onToast?.(
                                item.visibility === 'shared'
                                  ? 'اشتراک نما لغو شد'
                                  : 'نما با تیم به اشتراک گذاشته شد',
                              ),
                            )
                          }
                        >
                          {item.visibility === 'shared' ? 'خصوصی' : 'اشتراک'}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                ))
              )}
              {shared.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">نماهای مشترک تیم</p>
                  {shared.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1.5"
                    >
                      <span className="truncate text-sm" title={item.ownerName ?? undefined}>
                        {item.name}
                        <span className="ms-2 text-[10px] text-muted-foreground">
                          {item.ownerName ?? 'کاربر حذف‌شده'}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          void forkSavedView(item.id, {
                            name: `کپی ${item.name}`,
                          }).then((forked) => {
                            onToast?.(`نسخه شخصی «${forked.name}» ذخیره شد`);
                            onSelectView(forked);
                          })
                        }
                      >
                        ذخیره نسخه شخصی
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              {renameTarget ? (
                <div className="space-y-2 border-t border-border pt-2">
                  <Label htmlFor={nameId}>نام جدید برای «{renameTarget.name}»</Label>
                  <Input id={nameId} value={name} onChange={(event) => setName(event.target.value)} />
                  <Button type="button" size="sm" disabled={isSaving} onClick={() => void handleRename()}>
                    ذخیره نام
                  </Button>
                </div>
              ) : null}
              {deleteTarget ? (
                <div className="space-y-2 border-t border-border pt-2">
                  <p className="text-sm">حذف «{deleteTarget.name}»؟</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={() => void handleDelete()}
                    >
                      حذف
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteTarget(null)}>
                      انصراف
                    </Button>
                  </div>
                </div>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={() => setManageOpen(false)}>
                بازگشت
              </Button>
            </div>
          ) : (
            <>
              <p className="px-2 py-1 text-xs text-muted-foreground">نماها</p>
              {items.length === 0 ? (
                <p className="px-2 py-2 text-sm text-muted-foreground">نمایی ذخیره نشده است.</p>
              ) : (
                mine.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
                    onClick={() => {
                      onSelectView(item);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${item.id === activeViewId ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.isDefault ? (
                      <span className="text-[10px] text-muted-foreground">پیش‌فرض</span>
                    ) : null}
                    {item.visibility === 'shared' ? (
                      <span className="text-[10px] text-muted-foreground">مشترک</span>
                    ) : null}
                  </button>
                ))
              )}
              {canUseShared && shared.length > 0 ? (
                <>
                  <div className="my-1 border-t border-border" />
                  <p className="px-2 py-1 text-xs text-muted-foreground">نماهای مشترک تیم</p>
                  {shared.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      title={item.ownerName ?? undefined}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
                      onClick={() => {
                        onSelectView(item);
                        setOpen(false);
                      }}
                    >
                      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden />
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.ownerName ?? 'کاربر حذف‌شده'}
                      </span>
                    </button>
                  ))}
                </>
              ) : null}
              <div className="my-1 border-t border-border" />
              {canManage ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
                    onClick={() => {
                      setSaveOpen(true);
                      setFormError(null);
                      setName('');
                      setDescription('');
                      setIsDefault(false);
                    }}
                  >
                    + ذخیره نمای فعلی
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
                    onClick={() => setManageOpen(true)}
                  >
                    مدیریت نماها…
                  </button>
                </>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
