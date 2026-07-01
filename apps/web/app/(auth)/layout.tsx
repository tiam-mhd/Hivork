import type { ReactNode } from 'react';

import { AppBrand } from '@/components/layout/app-brand';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell-auth">
      <AppBrand subtitle="پلتفرم مدیریت اقساط برای فروشگاه‌ها" className="mb-8" />
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        نسخه توسعه · Hivork Phase 1
      </p>
    </main>
  );
}
