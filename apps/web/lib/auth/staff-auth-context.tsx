'use client';

import type { AuthResponseDto, RefreshSessionResponseDto } from '@hivork/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearAuthRegistry,
  getAccessToken,
  setAccessToken as setTokenRegistry,
  setActiveBranchId as setBranchRegistry,
} from './auth-token';
import { clearStaffSessionMarker, setStaffSessionMarker } from './session-marker';
import { apiFetch } from '../api/client';

export type StaffAuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  staff: NonNullable<AuthResponseDto['staff']> | null;
  tenant: NonNullable<AuthResponseDto['tenant']> | null;
  activeBranchId: string | null;
};

type StaffAuthContextValue = StaffAuthState & {
  establishSession: (response: AuthResponseDto) => void;
  setActiveBranch: (branchId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StaffAuthState>({
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
    staff: null,
    tenant: null,
    activeBranchId: null,
  });

  const establishSession = useCallback((response: AuthResponseDto) => {
    setTokenRegistry(response.accessToken);
    setStaffSessionMarker();
    setState({
      isLoading: false,
      isAuthenticated: true,
      accessToken: response.accessToken,
      staff: response.staff ?? null,
      tenant: response.tenant ?? null,
      activeBranchId: null,
    });
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const result = await apiFetch<RefreshSessionResponseDto>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ actor: 'staff' }),
      });
      setTokenRegistry(result.accessToken);
      setStaffSessionMarker();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: true,
        accessToken: result.accessToken,
      }));
      return true;
    } catch {
      const existingToken = getAccessToken();
      if (existingToken) {
        setStaffSessionMarker();
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: true,
          accessToken: existingToken,
        }));
        return true;
      }

      clearAuthRegistry();
      clearStaffSessionMarker();
      setState({
        isLoading: false,
        isAuthenticated: false,
        accessToken: null,
        staff: null,
        tenant: null,
        activeBranchId: null,
      });
      return false;
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const setActiveBranch = useCallback(async (branchId: string) => {
    await apiFetch('/staff/me/active-branch', {
      method: 'PATCH',
      body: JSON.stringify({ branchId }),
    });
    setBranchRegistry(branchId);
    setState((prev) => ({ ...prev, activeBranchId: branchId }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ actor: 'staff' }),
      });
    } finally {
      clearAuthRegistry();
      clearStaffSessionMarker();
      setState({
        isLoading: false,
        isAuthenticated: false,
        accessToken: null,
        staff: null,
        tenant: null,
        activeBranchId: null,
      });
    }
  }, []);

  const value = useMemo<StaffAuthContextValue>(
    () => ({
      ...state,
      establishSession,
      setActiveBranch,
      logout,
      refreshSession,
    }),
    [state, establishSession, setActiveBranch, logout, refreshSession],
  );

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuthContext(): StaffAuthContextValue {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) {
    throw new Error('useStaffAuth must be used within StaffAuthProvider');
  }
  return ctx;
}
