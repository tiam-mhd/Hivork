'use client';

import type { SaleDetailDto } from '@hivork/contracts/installments';
import { useCallback, useEffect, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { ApiClientError } from '@/lib/api/client';
import { cancelSale, fetchSaleDetail } from '@/lib/api/sale-detail';

export function useSaleDetail(saleId: string) {
  const { resolve } = useApiError();
  const [sale, setSale] = useState<SaleDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setForbidden(false);

    try {
      const detail = await fetchSaleDetail(saleId);
      setSale(detail);
    } catch (err) {
      if (err instanceof ApiClientError && err.httpStatus === 404) {
        setNotFound(true);
        setSale(null);
        return;
      }
      if (err instanceof ApiClientError && err.httpStatus === 403) {
        setForbidden(true);
        setSale(null);
        return;
      }
      setError(resolve(err));
      setSale(null);
    } finally {
      setLoading(false);
    }
  }, [resolve, saleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = useCallback(
    async (reason: string) => {
      setCancelling(true);
      setToast(null);

      try {
        await cancelSale(saleId, { reason });
        setToast('فروش با موفقیت لغو شد.');
        await load();
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (
            err.code === 'SALE_HAS_PAID_INSTALLMENT' ||
            err.code === 'SALE_ALREADY_CANCELLED'
          ) {
            setToast(resolve(err));
            await load();
            return;
          }
          if (err.code === 'PERMISSION_DENIED') {
            setToast(resolve(err));
            return;
          }
        }
        setToast(err instanceof ApiClientError ? resolve(err) : 'لغو فروش ناموفق بود.');
      } finally {
        setCancelling(false);
      }
    },
    [load, resolve, saleId],
  );

  const clearToast = useCallback(() => setToast(null), []);

  return {
    sale,
    loading,
    error,
    notFound,
    forbidden,
    toast,
    cancelling,
    reload: load,
    cancel,
    clearToast,
  };
}
