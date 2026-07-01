export default function CustomerPortalPage() {
  return (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground">
      <p>این بخش در فاز ۲ تکمیل می‌شود.</p>
      <p>
        فعلاً از{' '}
        <a href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          ورود پرسنل
        </a>{' '}
        برای پنل فروشنده استفاده کنید.
      </p>
    </div>
  );
}
