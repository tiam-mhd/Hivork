import Link from 'next/link';

export default function MarketingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-6">
          <p className="inline-flex w-fit rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            ماژول اول: مدیریت اقساط
          </p>
          <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
            فروش اقساطی را
            <span className="text-primary"> ساده و شفاف </span>
            مدیریت کنید
          </h1>
          <p className="max-w-lg text-lg leading-8 text-muted-foreground">
            پنل فروشنده، ثبت مشتری و فروش، پیگیری اقساط و گزارش معوقات — همه در یک
            پلتفرم SaaS ماژولار برای بازار ایران.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
            >
              ورود به پنل
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              ساخت فروشگاه جدید
            </Link>
          </div>
        </div>

        <div className="app-card p-6">
          <p className="text-sm font-medium text-muted-foreground">نمای سریع پنل</p>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              'ثبت مشتری و فروش اقساطی',
              'جدول اقساط خودکار',
              'گزارش معوقات و سررسید امروز',
              'مدیریت شعب، پرسنل و نقش‌ها',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/50 p-4 text-xs text-muted-foreground">
            برای تست: ورود با شماره{' '}
            <span dir="ltr" className="font-mono text-foreground">
              09120000000
            </span>{' '}
            (مالک demo-shop)
          </div>
        </div>
      </div>
    </div>
  );
}
