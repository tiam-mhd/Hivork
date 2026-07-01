'use client';

import { useCallback, useState } from 'react';

import { ApiClientError } from '@/lib/api/client';
import { useStaffAuth } from '@/lib/auth/use-staff-auth';
import { useAdminSession } from '@/lib/layout/admin-session-context';

export function useActiveBranch() {
  const { staff, branches, setStaffActiveBranchId, refetch } = useAdminSession();
  const { setActiveBranch: patchActiveBranch } = useStaffAuth();
  const [isSwitching, setIsSwitching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeBranchId = staff?.activeBranchId ?? null;
  const activeBranch = branches.find((branch) => branch.id === activeBranchId) ?? null;

  const switchBranch = useCallback(
    async (branchId: string) => {
      if (!staff || branchId === activeBranchId) {
        return;
      }

      const previousId = activeBranchId;
      setIsSwitching(true);
      setToast(null);
      setStaffActiveBranchId(branchId);

      try {
        await patchActiveBranch(branchId);
        await refetch();
      } catch (err) {
        setStaffActiveBranchId(previousId);
        const message =
          err instanceof ApiClientError && err.code === 'BRANCH_NOT_ALLOWED'
            ? 'شما به این شعبه دسترسی ندارید.'
            : err instanceof ApiClientError
              ? err.message
              : 'تغییر شعبه ناموفق بود.';
        setToast(message);
      } finally {
        setIsSwitching(false);
      }
    },
    [staff, activeBranchId, setStaffActiveBranchId, patchActiveBranch, refetch],
  );

  const clearToast = useCallback(() => setToast(null), []);

  return {
    branches,
    activeBranchId,
    activeBranch,
    isSwitching,
    toast,
    clearToast,
    switchBranch,
  };
}
