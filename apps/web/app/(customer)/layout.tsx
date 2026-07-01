import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hivork/ui';
import type { ReactNode } from 'react';

import { AppBrand } from '@/components/layout/app-brand';

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell-auth">
      <AppBrand subtitle="پورتال مشتری" className="mb-8" />
      <Card className="app-card w-full max-w-md">
        <CardHeader>
          <CardTitle>پورتال مشتری</CardTitle>
          <CardDescription>مشاهده اقساط و پرداخت‌ها (فاز بعدی)</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
