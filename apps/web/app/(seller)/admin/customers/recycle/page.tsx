'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hivork/ui';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { apiFetch, ApiClientError } from '@/lib/api/client';

type RecycleItem = {
  id: string;
  localCode: string | null;
  deletedAt: string;
  customer: { phone: string; name: string | null };
};

type RecycleResponse = {
  items: RecycleItem[];
};

export default function CustomersRecyclePage() {
  return (
    <RequirePermission permission="core.recycle.view">
      <CustomersRecycleContent />
    </RequirePermission>
  );
}

function CustomersRecycleContent() {
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<RecycleResponse>('/customers/recycle');
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'بارگذاری سطل بازیافت ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function restore(id: string) {
    setActionId(id);
    setError(null);
    try {
      await apiFetch(`/customers/${id}/restore`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'بازیابی مشتری ناموفق بود');
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-neutral-600">
        <Link href="/admin" className="hover:underline">
          داشبورد
        </Link>
        <span className="mx-2">/</span>
        <Link href="/admin/customers" className="hover:underline">
          مشتریان
        </Link>
        <span className="mx-2">/</span>
        <span>سطل بازیافت</span>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">سطل بازیافت مشتریان</h1>
        <Button asChild variant="outline">
          <Link href="/admin/customers">بازگشت</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مشتریان حذف‌شده</CardTitle>
          <CardDescription>بازیابی مشتریان soft-delete شده</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-12 animate-pulse rounded bg-neutral-100" />
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-neutral-600">موردی برای بازیابی وجود ندارد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-start text-neutral-600">
                    <th className="p-2">نام</th>
                    <th className="p-2">موبایل</th>
                    <th className="p-2">حذف شده در</th>
                    <th className="p-2">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2">{item.customer.name ?? '—'}</td>
                      <td className="p-2" dir="ltr">
                        {item.customer.phone}
                      </td>
                      <td className="p-2">{new Date(item.deletedAt).toLocaleString('fa-IR')}</td>
                      <td className="p-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={actionId === item.id}
                          onClick={() => void restore(item.id)}
                        >
                          {actionId === item.id ? '...' : 'بازیابی'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
