'use client';

import type { CheckSummaryDto } from '@hivork/contracts/payments';
import type { GetCheckTrackingResponseDto } from '@hivork/contracts/payments';
import { isoToJalaliDisplay } from '@hivork/i18n';
import { Button, Input, Label, Textarea } from '@hivork/ui';
import { useCallback, useEffect, useState } from 'react';

import {
  BounceCheckDialog,
  CollectCheckDialog,
  TransferCheckDialog,
} from '@/components/payments/check-action-dialogs';
import { PaymentsSideDrawer } from '@/components/payments/payments-side-drawer';
import { useApiError } from '@/hooks/use-api-error';
import { usePermission } from '@/hooks/use-permission';
import {
  addCheckTrackingNote,
  getCheckImage,
  getCheckTracking,
  uploadCheckImage,
} from '@/lib/api/payments';
import { formatToman } from '@/lib/i18n';
import { CHECK_IMAGE_ACCEPT, validateCheckImageFile } from '@/lib/payments/check-image-validation';
import {
  CHECK_STATUS_LABELS,
  CHECK_TYPE_LABELS,
  checkTrackingActionLabel,
} from '@/lib/payments/check-labels';

type CheckDetailDrawerProps = {
  check: CheckSummaryDto | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

export function CheckDetailDrawer({ check, open, onClose, onUpdated }: CheckDetailDrawerProps) {
  const { resolve } = useApiError();
  const canCollect = usePermission('installments.check.collect');
  const canBounce = usePermission('installments.check.bounce');
  const canTransfer = usePermission('installments.check.transfer');
  const canUpdate = usePermission('installments.check.update');

  const [tracking, setTracking] = useState<GetCheckTrackingResponseDto | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [notePending, setNotePending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);

  const [collectOpen, setCollectOpen] = useState(false);
  const [bounceOpen, setBounceOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const loadTracking = useCallback(async () => {
    if (!check) return;
    setTrackingLoading(true);
    try {
      const data = await getCheckTracking(check.id);
      setTracking(data);
    } catch {
      setTracking(null);
    } finally {
      setTrackingLoading(false);
    }
  }, [check]);

  const loadImage = useCallback(async () => {
    if (!check) return;
    try {
      const data = await getCheckImage(check.id);
      setImageUrl(data.url);
    } catch {
      setImageUrl(null);
    }
  }, [check]);

  useEffect(() => {
    if (open && check) {
      void loadTracking();
      void loadImage();
    }
  }, [open, check, loadTracking, loadImage]);

  async function submitNote() {
    if (!check || !noteBody.trim()) return;
    setNotePending(true);
    try {
      await addCheckTrackingNote(check.id, { body: noteBody.trim() });
      setNoteBody('');
      await loadTracking();
      onUpdated();
    } catch (err) {
      setUploadError(resolve(err));
    } finally {
      setNotePending(false);
    }
  }

  async function handleImageUpload(file: File | undefined) {
    if (!check || !file) return;
    const validation = validateCheckImageFile(file);
    if (!validation.ok) {
      setUploadError(validation.message);
      return;
    }
    setUploadPending(true);
    setUploadError(null);
    try {
      await uploadCheckImage(check.id, file);
      await loadImage();
      await loadTracking();
      onUpdated();
    } catch (err) {
      setUploadError(resolve(err));
    } finally {
      setUploadPending(false);
    }
  }

  if (!check) return null;

  const actionable =
    check.status === 'registered' || check.status === 'due';

  return (
    <>
      <PaymentsSideDrawer
        open={open}
        title={`چک ${check.checkNumber}`}
        description={`${check.bankName} · ${CHECK_TYPE_LABELS[check.checkType]}`}
        onClose={onClose}
        footer={
          actionable ? (
            <div className="flex flex-wrap gap-2">
              {canCollect ? (
                <Button type="button" size="sm" onClick={() => setCollectOpen(true)}>
                  وصول
                </Button>
              ) : null}
              {canTransfer ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                  انتقال
                </Button>
              ) : null}
              {canBounce && check.checkType === 'received' ? (
                <Button type="button" size="sm" variant="destructive" onClick={() => setBounceOpen(true)}>
                  برگشت
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">مبلغ</dt>
            <dd className="font-semibold tabular-nums">{formatToman(BigInt(check.amountRial))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">وضعیت</dt>
            <dd>{CHECK_STATUS_LABELS[check.status]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">سررسید</dt>
            <dd>{isoToJalaliDisplay(check.dueDate.slice(0, 10), 'fa', { persianDigits: true })}</dd>
          </div>
        </dl>

        <section className="mt-6">
          <h3 className="mb-2 font-medium">تصویر چک</h3>
          {imageUrl ? (
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline"
            >
              مشاهده / دانلود تصویر
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">تصویری آپلود نشده است.</p>
          )}
          {canUpdate ? (
            <div className="mt-3">
              <Label htmlFor="check-image-upload">آپلود تصویر (JPEG/PNG/PDF، حداکثر ۵MB)</Label>
              <Input
                id="check-image-upload"
                type="file"
                accept={CHECK_IMAGE_ACCEPT}
                disabled={uploadPending}
                className="mt-1"
                onChange={(event) => void handleImageUpload(event.target.files?.[0])}
              />
            </div>
          ) : null}
          {uploadError ? <p className="mt-2 text-sm text-destructive">{uploadError}</p> : null}
        </section>

        <section className="mt-6">
          <h3 className="mb-2 font-medium">پیگیری</h3>
          {trackingLoading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : (
            <ul className="space-y-3">
              {(tracking?.timeline ?? []).map((event, index) => (
                <li key={`${event.action}-${event.at}-${index}`} className="rounded-lg border border-border p-3 text-sm">
                  <div className="font-medium">{checkTrackingActionLabel(event.action)}</div>
                  <div className="text-muted-foreground">
                    {isoToJalaliDisplay(event.at.slice(0, 10), 'fa', { persianDigits: true })}
                  </div>
                  {event.note ? <p className="mt-1">{event.note}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {canUpdate ? (
          <section className="mt-6 space-y-2">
            <h3 className="font-medium">یادداشت پیگیری</h3>
            <Textarea
              value={noteBody}
              disabled={notePending}
              onChange={(event) => setNoteBody(event.target.value)}
              rows={2}
              placeholder="مثلاً: تماس با بانک"
            />
            <Button type="button" size="sm" disabled={notePending} onClick={() => void submitNote()}>
              {notePending ? 'در حال ثبت...' : 'افزودن یادداشت'}
            </Button>
            {(tracking?.followUpNotes ?? []).length > 0 ? (
              <ul className="mt-3 space-y-2">
                {tracking!.followUpNotes.map((note) => (
                  <li key={note.id} className="rounded-lg bg-muted/40 p-2 text-sm">
                    {note.body}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </PaymentsSideDrawer>

      <CollectCheckDialog
        check={check}
        open={collectOpen}
        onClose={() => setCollectOpen(false)}
        onSuccess={() => {
          onUpdated();
          void loadTracking();
        }}
      />
      <BounceCheckDialog
        check={check}
        open={bounceOpen}
        onClose={() => setBounceOpen(false)}
        onSuccess={onUpdated}
      />
      <TransferCheckDialog
        check={check}
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={onUpdated}
      />
    </>
  );
}
