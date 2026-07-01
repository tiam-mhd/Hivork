import type { ReactNode } from 'react';

import '@/components/print/print-styles.css';

export default function PrintRouteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-foreground">
      {children}
    </div>
  );
}
