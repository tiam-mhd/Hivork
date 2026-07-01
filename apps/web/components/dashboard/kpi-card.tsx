'use client';

import { Card, CardContent } from '@hivork/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

type KpiCardProps = {
  label: string;
  value: ReactNode;
  loading?: boolean;
  href?: string;
};

export function KpiCard({ label, value, loading = false, href }: KpiCardProps) {
  const content = (
    <Card className={href ? 'border-border/80 transition-shadow hover:shadow-md' : 'border-border/80'}>
      <CardContent className="flex flex-col gap-1.5 p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading ? (
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-card-foreground">{value}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href && !loading) {
    return (
      <Link
        href={href}
        className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true" aria-label="در حال بارگذاری شاخص‌ها">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 h-4 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-16 animate-pulse rounded-md bg-muted/70" />
        </div>
      ))}
    </div>
  );
}
