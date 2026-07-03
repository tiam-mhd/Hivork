'use client';

import type { InstallmentInSaleDto, SaleDetailEnterpriseDto } from '@hivork/contracts/installments';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useApiError } from '@/hooks/use-api-error';
import { fetchSaleDetail } from '@/lib/api/sale-detail';
import { ApiClientError } from '@/lib/api/client';

export type InstallmentDetailView = {
  installment: InstallmentInSaleDto;
  sale: SaleDetailEnterpriseDto;
  version: number;
};

export function useInstallmentDetail(installmentId: string) {
  const searchParams = useSearchParams();
  const saleIdParam = searchParams.get('saleId');
  const { resolve } = useApiError();

  const [detail, setDetail] = useState<InstallmentDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [missingSaleId, setMissingSaleId] = useState(false);

  const load = useCallback(async () => {
    if (!saleIdParam) {
      setMissingSaleId(true);
      setLoading(false);
      setDetail(null);
      return;
    }

    setMissingSaleId(false);
    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      const sale = await fetchSaleDetail(saleIdParam);
      const installment = sale.installments.find((row) => row.id === installmentId);

      if (!installment) {
        setError('قسط در این قرارداد یافت نشد.');
        setDetail(null);
        return;
      }

      setDetail({
        installment,
        sale,
        version: installment.version ?? 1,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.httpStatus === 403) {
        setForbidden(true);
        setDetail(null);
        return;
      }

      setError(resolve(err));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [installmentId, resolve, saleIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const setVersion = useCallback((version: number) => {
    setDetail((current) => (current ? { ...current, version } : current));
  }, []);

  const breadcrumbLabel = useMemo(() => {
    if (!detail) {
      return undefined;
    }

    return `قسط ${detail.installment.sequenceNumber}`;
  }, [detail]);

  return {
    detail,
    loading,
    error,
    forbidden,
    missingSaleId,
    reload: load,
    setVersion,
    breadcrumbLabel,
    saleId: saleIdParam,
  };
}
