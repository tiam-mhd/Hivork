'use client';

import type { CustomerNoteDto } from '@hivork/contracts/customers';
import { formatIsoDateAsJalali } from '@hivork/i18n';
import { Button, Card, CardContent, Label, Textarea } from '@hivork/ui';
import { useCallback, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { usePermission } from '@/hooks/use-permission';
import { ApiClientError } from '@/lib/api/client';
import {
  createCustomerNote,
  deleteCustomerNote,
  updateCustomerNote,
  useCustomerNotes,
  useInvalidateCustomerQueries,
} from '@/lib/api/customers';

type CustomerNotesTabProps = {
  customerId: string;
  active: boolean;
};

export function CustomerNotesTab({ customerId, active }: CustomerNotesTabProps) {
  const { resolve } = useApiError();
  const invalidate = useInvalidateCustomerQueries();
  const canCreate = usePermission('installments.customer.note.create');
  const canUpdate = usePermission('installments.customer.note.update');
  const canDelete = usePermission('installments.customer.note.delete');
  const canDeleteAny = usePermission('installments.customer.note.delete.any');

  const { items, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useCustomerNotes(customerId, active);

  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<CustomerNoteDto | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const handleCreate = useCallback(async () => {
    const body = draft.trim();
    if (!body) {
      setFormError('متن یادداشت الزامی است.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createCustomerNote(customerId, { body });
      setDraft('');
      invalidate(customerId);
      await refetch();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? resolve(err) : 'ثبت یادداشت ناموفق بود.');
    } finally {
      setSubmitting(false);
    }
  }, [customerId, draft, invalidate, refetch, resolve]);

  const handleUpdate = useCallback(async () => {
    if (!editingNote) {
      return;
    }
    const body = editDraft.trim();
    if (!body) {
      setFormError('متن یادداشت الزامی است.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await updateCustomerNote(customerId, editingNote.id, { body });
      setEditingNote(null);
      setEditDraft('');
      invalidate(customerId);
      await refetch();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? resolve(err) : 'ویرایش یادداشت ناموفق بود.');
    } finally {
      setSubmitting(false);
    }
  }, [customerId, editDraft, editingNote, invalidate, refetch, resolve]);

  const handleDelete = useCallback(
    async (note: CustomerNoteDto) => {
      setSubmitting(true);
      setFormError(null);
      try {
        await deleteCustomerNote(customerId, note.id);
        invalidate(customerId);
        await refetch();
      } catch (err) {
        setFormError(err instanceof ApiClientError ? resolve(err) : 'حذف یادداشت ناموفق بود.');
      } finally {
        setSubmitting(false);
      }
    },
    [customerId, invalidate, refetch, resolve],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'بارگذاری یادداشت‌ها ناموفق بود.'}
          </p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canCreate ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <Label htmlFor="customer-note-draft">یادداشت جدید</Label>
            <Textarea
              id="customer-note-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="یادداشت داخلی برای تیم…"
              rows={3}
              disabled={submitting}
            />
            {formError && !editingNote ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <div>
              <Button type="button" disabled={submitting} onClick={() => void handleCreate()}>
                {submitting ? 'در حال ثبت…' : 'ثبت یادداشت'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            یادداشتی ثبت نشده است.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((note) => (
            <li key={note.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 pt-6">
                  {editingNote?.id === note.id ? (
                    <>
                      <Textarea
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        rows={3}
                        disabled={submitting}
                      />
                      {formError ? (
                        <p className="text-sm text-destructive" role="alert">
                          {formError}
                        </p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={submitting}
                          onClick={() => void handleUpdate()}
                        >
                          ذخیره
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() => {
                            setEditingNote(null);
                            setEditDraft('');
                            setFormError(null);
                          }}
                        >
                          انصراف
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {note.author?.name ?? 'کارمند'} ·{' '}
                          {formatIsoDateAsJalali(note.createdAt.slice(0, 10))}
                          {note.isPinned ? ' · سنجاق‌شده' : ''}
                        </span>
                        <div className="flex gap-2">
                          {canUpdate ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingNote(note);
                                setEditDraft(note.body);
                                setFormError(null);
                              }}
                            >
                              ویرایش
                            </Button>
                          ) : null}
                          {canDelete || canDeleteAny ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={submitting}
                              onClick={() => void handleDelete(note)}
                            >
                              حذف
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          disabled={isFetchingNextPage}
          onClick={fetchNextPage}
        >
          {isFetchingNextPage ? 'در حال بارگذاری…' : 'نمایش بیشتر'}
        </Button>
      ) : null}
    </div>
  );
}
