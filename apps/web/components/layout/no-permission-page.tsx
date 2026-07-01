'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@hivork/ui';
import Link from 'next/link';

import { useAdminSession } from '@/lib/layout/admin-session-context';
import { getPermissionLabelFa } from '@/lib/navigation/admin-menu';

type NoPermissionPageProps = {
  required: string;
  backHref?: string;
};

export function NoPermissionPage({ required, backHref = '/admin/dashboard' }: NoPermissionPageProps) {
  const { staff } = useAdminSession();

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">دسترسی محدود</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <p className="text-4xl" aria-hidden>
          🔒
        </p>
        <p className="text-sm text-neutral-600">شما مجوز مشاهده این صفحه را ندارید.</p>

        {staff ? (
          <div className="w-full rounded-md bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            <p>
              کاربر: <span className="font-medium">{staff.name}</span>
            </p>
            <p className="mt-1">
              مجوز لازم: <span className="font-medium">{getPermissionLabelFa(required)}</span>
            </p>
          </div>
        ) : null}

        <Button asChild>
          <Link href={backHref}>بازگشت به داشبورد</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
