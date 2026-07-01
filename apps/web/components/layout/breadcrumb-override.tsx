'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type BreadcrumbOverrideContextValue = {
  overrideLabel: string | null;
  setOverrideLabel: (label: string | null) => void;
};

const BreadcrumbOverrideContext = createContext<BreadcrumbOverrideContextValue | null>(null);

export function BreadcrumbOverrideProvider({ children }: { children: ReactNode }) {
  const [overrideLabel, setOverrideLabel] = useState<string | null>(null);
  const value = useMemo(
    () => ({ overrideLabel, setOverrideLabel }),
    [overrideLabel],
  );

  return (
    <BreadcrumbOverrideContext.Provider value={value}>{children}</BreadcrumbOverrideContext.Provider>
  );
}

export function useBreadcrumbOverride(label: string | null) {
  const context = useContext(BreadcrumbOverrideContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setOverrideLabel(label);
    return () => context.setOverrideLabel(null);
  }, [context, label]);
}

export function useBreadcrumbOverrideLabel(): string | null {
  return useContext(BreadcrumbOverrideContext)?.overrideLabel ?? null;
}
