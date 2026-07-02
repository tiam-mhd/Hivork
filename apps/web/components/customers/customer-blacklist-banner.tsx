'use client';

type CustomerBlacklistBannerProps = {
  reason?: string | null;
};

export function CustomerBlacklistBanner({ reason }: CustomerBlacklistBannerProps) {
  return (
    <div
      className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      <p className="font-medium">این مشتری در بلک‌لیست است.</p>
      {reason?.trim() ? (
        <p className="mt-1 text-destructive/90">دلیل: {reason.trim()}</p>
      ) : null}
      <p className="mt-1 text-xs text-destructive/80">ثبت فروش جدید برای این مشتری مجاز نیست.</p>
    </div>
  );
}
