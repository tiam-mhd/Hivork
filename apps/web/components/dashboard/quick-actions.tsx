'use client';

import { Button } from '@hivork/ui';
import Link from 'next/link';

import { resolveQuickActionVisibility } from './quick-actions.utils';

import { usePermission } from '@/hooks/use-permission';

export function QuickActions() {
  const canCreateSale = usePermission('installments.sale.create');
  const canCreateCustomer = usePermission('installments.customer.create');
  const { showSale, showCustomer, showAny } = resolveQuickActionVisibility((permission) => {
    if (permission === 'installments.sale.create') return canCreateSale;
    if (permission === 'installments.customer.create') return canCreateCustomer;
    return false;
  });

  if (!showAny) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {showSale ? (
        <Button asChild>
          <Link href="/admin/sales/new">＋ فروش جدید</Link>
        </Button>
      ) : null}
      {showCustomer ? (
        <Button asChild variant="outline">
          <Link href="/admin/customers/new">＋ مشتری جدید</Link>
        </Button>
      ) : null}
    </div>
  );
}
