'use client';

import type { CashflowReportResponseDto, DashboardReportResponseDto, TodayDueReportResponseDto } from '@hivork/contracts/reports';
import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch, ApiClientError } from '@/lib/api/client';
import { useApiError } from '@/hooks/use-api-error';
import { useAdminSession } from '@/lib/layout/admin-session-context';

export type DashboardState = {
  dashboard: DashboardReportResponseDto | null;
  todayDue: TodayDueReportResponseDto | null;
  cashflow: CashflowReportResponseDto | null;
  dashboardLoading: boolean;
  todayDueLoading: boolean;
  cashflowLoading: boolean;
  dashboardError: string | null;
  todayDueError: string | null;
  cashflowError: string | null;
  forbidden: boolean;
  lastFetchedAt: Date | null;
};

const initialState: DashboardState = {
  dashboard: null,
  todayDue: null,
  cashflow: null,
  dashboardLoading: true,
  todayDueLoading: true,
  cashflowLoading: true,
  dashboardError: null,
  todayDueError: null,
  cashflowError: null,
  forbidden: false,
  lastFetchedAt: null,
};

export function useDashboard() {
  const { staff } = useAdminSession();
  const { resolve } = useApiError();
  const [state, setState] = useState<DashboardState>(initialState);
  const requestIdRef = useRef(0);

  const activeBranchId = staff?.activeBranchId ?? null;

  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((prev) => ({
      ...prev,
      dashboardLoading: true,
      todayDueLoading: true,
      cashflowLoading: true,
      dashboardError: null,
      todayDueError: null,
      cashflowError: null,
      forbidden: false,
    }));

    const branchQuery = activeBranchId ? `?branchId=${activeBranchId}` : '';

    const [dashboardResult, todayDueResult, cashflowResult] = await Promise.allSettled([
      apiFetch<DashboardReportResponseDto>(`/reports/dashboard${branchQuery}`),
      apiFetch<TodayDueReportResponseDto>(`/reports/today-due?limit=10${activeBranchId ? `&branchId=${activeBranchId}` : ''}`),
      apiFetch<CashflowReportResponseDto>(`/reports/cashflow${branchQuery}`),
    ]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    const next: DashboardState = {
      dashboard: null,
      todayDue: null,
      cashflow: null,
      dashboardLoading: false,
      todayDueLoading: false,
      cashflowLoading: false,
      dashboardError: null,
      todayDueError: null,
      cashflowError: null,
      forbidden: false,
      lastFetchedAt: new Date(),
    };

    if (dashboardResult.status === 'fulfilled') {
      next.dashboard = dashboardResult.value;
    } else {
      const err = dashboardResult.reason;
      if (err instanceof ApiClientError && err.httpStatus === 403) {
        next.forbidden = true;
      }
      next.dashboardError = resolve(err);
    }

    if (todayDueResult.status === 'fulfilled') {
      next.todayDue = todayDueResult.value;
    } else {
      const err = todayDueResult.reason;
      if (err instanceof ApiClientError && err.httpStatus === 403) {
        next.forbidden = true;
      }
      next.todayDueError = resolve(err);
    }

    if (cashflowResult.status === 'fulfilled') {
      next.cashflow = cashflowResult.value;
    } else {
      next.cashflowError = resolve(cashflowResult.reason);
    }

    setState(next);
  }, [activeBranchId, resolve]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  const retryDashboard = useCallback(() => {
    setState((prev) => ({ ...prev, dashboardLoading: true, dashboardError: null }));
    void apiFetch<DashboardReportResponseDto>(
      `/reports/dashboard${activeBranchId ? `?branchId=${activeBranchId}` : ''}`,
    )
      .then((dashboard) => {
        setState((prev) => ({
          ...prev,
          dashboard,
          dashboardLoading: false,
          dashboardError: null,
          lastFetchedAt: new Date(),
        }));
      })
      .catch((err: unknown) => {
        setState((prev) => ({
          ...prev,
          dashboardLoading: false,
          dashboardError: resolve(err),
          forbidden: err instanceof ApiClientError && err.httpStatus === 403,
        }));
      });
  }, [activeBranchId, resolve]);

  const retryTodayDue = useCallback(() => {
    setState((prev) => ({ ...prev, todayDueLoading: true, todayDueError: null }));
    void apiFetch<TodayDueReportResponseDto>(
      `/reports/today-due?limit=10${activeBranchId ? `&branchId=${activeBranchId}` : ''}`,
    )
      .then((todayDue) => {
        setState((prev) => ({
          ...prev,
          todayDue,
          todayDueLoading: false,
          todayDueError: null,
          lastFetchedAt: new Date(),
        }));
      })
      .catch((err: unknown) => {
        setState((prev) => ({
          ...prev,
          todayDueLoading: false,
          todayDueError: resolve(err),
        }));
      });
  }, [activeBranchId, resolve]);

  return {
    ...state,
    refresh,
    retryDashboard,
    retryTodayDue,
    isRefreshing:
      state.dashboardLoading || state.todayDueLoading || state.cashflowLoading,
  };
}
