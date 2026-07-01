'use client';

import type { BranchListItemDto, StaffMeResponseDto, TenantMeResponseDto } from '@hivork/contracts';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiFetch, ApiClientError } from '@/lib/api/client';
import { setActiveBranchId as setBranchRegistry } from '@/lib/auth/auth-token';
import { useStaffAuth } from '@/lib/auth/use-staff-auth';

export type AdminSessionState = {
  isLoading: boolean;
  error: string | null;
  staff: StaffMeResponseDto | null;
  tenant: TenantMeResponseDto['tenant'] | null;
  branches: BranchListItemDto[];
};

type AdminSessionContextValue = AdminSessionState & {
  refetch: () => Promise<void>;
  setStaffActiveBranchId: (branchId: string | null) => void;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

function filterAllowedBranches(
  branches: BranchListItemDto[],
  assignedBranchIds: string[],
): BranchListItemDto[] {
  const active = branches.filter((branch) => branch.isActive);
  if (assignedBranchIds.length === 0) {
    return active;
  }
  const allowed = new Set(assignedBranchIds);
  return active.filter((branch) => allowed.has(branch.id));
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useStaffAuth();
  const [state, setState] = useState<AdminSessionState>({
    isLoading: true,
    error: null,
    staff: null,
    tenant: null,
    branches: [],
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const [staffMe, tenantMe, branchList] = await Promise.all([
        apiFetch<StaffMeResponseDto>('/staff/me'),
        apiFetch<TenantMeResponseDto>('/tenants/me'),
        apiFetch<{ data: BranchListItemDto[] }>('/branches?limit=100'),
      ]);

      const allowedBranches = filterAllowedBranches(
        branchList.data,
        staffMe.assignedBranchIds,
      );

      const activeBranchId = staffMe.activeBranchId ?? tenantMe.activeBranchId;
      if (activeBranchId) {
        setBranchRegistry(activeBranchId);
      }

      setState({
        isLoading: false,
        error: null,
        staff: { ...staffMe, activeBranchId },
        tenant: tenantMe.tenant,
        branches: allowedBranches,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.httpStatus === 401) {
        router.replace('/login');
        return;
      }

      const message =
        err instanceof ApiClientError
          ? err.httpStatus === 403
            ? 'دسترسی به پنل مجاز نیست.'
            : err.message
          : 'بارگذاری اطلاعات کاربر ناموفق بود.';

      setState({
        isLoading: false,
        error: message,
        staff: null,
        tenant: null,
        branches: [],
      });
    }
  }, [router]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    void load();
  }, [authLoading, isAuthenticated, load, router]);

  const setStaffActiveBranchId = useCallback((branchId: string | null) => {
    setBranchRegistry(branchId);
    setState((prev) =>
      prev.staff
        ? {
            ...prev,
            staff: { ...prev.staff, activeBranchId: branchId },
          }
        : prev,
    );
  }, []);

  const value = useMemo<AdminSessionContextValue>(
    () => ({
      ...state,
      refetch: load,
      setStaffActiveBranchId,
    }),
    [state, load, setStaffActiveBranchId],
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error('useAdminSession must be used within AdminSessionProvider');
  }
  return ctx;
}
