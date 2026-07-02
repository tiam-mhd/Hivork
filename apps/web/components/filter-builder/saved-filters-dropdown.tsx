'use client';

import type { SavedFilterItemDto, SavedFilterResourceKeyDto } from '@hivork/contracts/core';
import type { FilterAst } from '@hivork/contracts/ui';
import type { FilterFieldDef } from '@hivork/contracts/ui';
import { Button, Input, Label, Textarea } from '@hivork/ui';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { useSavedFilters } from '@/hooks/use-saved-filters';
import { ApiClientError } from '@/lib/api/client';
import { validateFilterAstForApply } from '@/lib/filter/filter-ast.utils';

type SavedFiltersDropdownProps = {
  resourceKey: SavedFilterResourceKeyDto;
  fields: FilterFieldDef[];
  currentFilterAst: FilterAst | null;
  onApply: (filterAst: FilterAst) => void;
  onToast?: (message: string) => void;
  disabled?: boolean;
};

export function SavedFiltersDropdown({
  resourceKey,
  fields,
  currentFilterAst,
  onApply,
  onToast,
  disabled = false,
}: SavedFiltersDropdownProps) {
  const menuId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedFilterItemDto | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    items,
    loading,
    forbidden,
    createSavedFilter,
    setAsDefault,
    deleteSavedFilter,
    isSaving,
    isDeleting,
  } = useSavedFilters(resourceKey);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const handleApply = useCallback(
    (item: SavedFilterItemDto) => {
      onApply(item.filterAst);
      onToast?.(`فیلتر «${item.name}» اعمال شد`);
      setOpen(false);
    },
    [onApply, onToast],
  );

  const handleSave = useCallback(async () => {
    setFormError(null);

    if (!name.trim()) {
      setFormError('نام فیلتر الزامی است.');
      return;
    }

    if (!currentFilterAst) {
      setFormError('ابتدا فیلتر پیشرفته را تنظیم کنید.');
      return;
    }

    const validation = validateFilterAstForApply(currentFilterAst, fields);
    if (!validation.valid) {
      setFormError(validation.message ?? 'فیلتر نامعتبر است.');
      return;
    }

    try {
      await createSavedFilter({
        name: name.trim(),
        description: description.trim() || undefined,
        filterAst: currentFilterAst,
        isDefault,
      });
      onToast?.('فیلتر ذخیره شد');
      setSaveOpen(false);
      setName('');
      setDescription('');
      setIsDefault(false);
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'SAVED_FILTER_NAME_EXISTS') {
        setFormError('این نام قبلاً استفاده شده است.');
        return;
      }
      if (error instanceof ApiClientError && error.code === 'PLAN_LIMIT_EXCEEDED') {
        setFormError('حداکثر تعداد فیلترهای ذخیره‌شده پر شده است.');
        return;
      }
      setFormError(error instanceof Error ? error.message : 'خطا در ذخیره فیلتر');
    }
  }, [createSavedFilter, currentFilterAst, description, fields, isDefault, name, onToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteSavedFilter(deleteTarget.id);
      onToast?.('فیلتر حذف شد');
      setDeleteTarget(null);
    } catch (error) {
      onToast?.(error instanceof Error ? error.message : 'خطا در حذف فیلتر');
    }
  }, [deleteSavedFilter, deleteTarget, onToast]);

  const handleToggleDefault = useCallback(
    async (item: SavedFilterItemDto) => {
      if (item.isDefault) {
        return;
      }

      try {
        await setAsDefault(item);
        onToast?.(`«${item.name}» به‌عنوان پیش‌فرض تنظیم شد`);
      } catch (error) {
        onToast?.(error instanceof Error ? error.message : 'خطا در تنظیم پیش‌فرض');
      }
    },
    [onToast, setAsDefault],
  );

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
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        فیلترهای من
        {items.length > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
            {items.length}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          id={menuId}
          className="absolute end-0 z-40 mt-2 w-72 rounded-xl border border-border bg-popover p-2 shadow-lg"
        >
          <div className="flex flex-col gap-1">
            {items.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                فیلتری ذخیره نشده است
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1 rounded-lg px-1 py-0.5 hover:bg-muted/60"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate px-2 py-2 text-start text-sm text-foreground"
                    onClick={() => handleApply(item)}
                  >
                    {item.name}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={item.isDefault ? 'فیلتر پیش‌فرض' : 'تنظیم به‌عنوان پیش‌فرض'}
                    onClick={() => void handleToggleDefault(item)}
                  >
                    {item.isDefault ? '★' : '☆'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-destructive"
                    aria-label={`حذف ${item.name}`}
                    onClick={() => setDeleteTarget(item)}
                  >
                    ×
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 border-t border-border pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={disabled || !currentFilterAst}
              onClick={() => {
                setSaveOpen(true);
                setFormError(null);
              }}
            >
              ذخیره فیلتر فعلی
            </Button>
          </div>
        </div>
      ) : null}

      {saveOpen ? (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          aria-labelledby="save-filter-title"
        >
          <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
            <h2 id="save-filter-title" className="text-lg font-semibold text-foreground">
              ذخیره فیلتر
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={nameId}>نام فیلتر</Label>
                <Input
                  id={nameId}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="مثلاً مشتریان معوق"
                  maxLength={120}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={descriptionId}>توضیح (اختیاری)</Label>
                <Textarea
                  id={descriptionId}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="یادداشت کوتاه برای خودتان"
                  maxLength={500}
                  rows={3}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(event) => setIsDefault(event.target.checked)}
                />
                پیش‌فرض برای این لیست
              </label>
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? 'در حال ذخیره…' : 'ذخیره'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setSaveOpen(false)}
              >
                انصراف
              </Button>
            </div>
          </div>
        </dialog>
      ) : null}

      {deleteTarget ? (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          aria-labelledby="delete-filter-title"
        >
          <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
            <h2 id="delete-filter-title" className="text-lg font-semibold text-foreground">
              فیلتر «{deleteTarget.name}» حذف شود؟
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              این فیلتر از لیست شما حذف می‌شود. می‌توانید بعداً بازیابی کنید.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
              >
                {isDeleting ? 'در حال حذف…' : 'حذف'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                انصراف
              </Button>
            </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
