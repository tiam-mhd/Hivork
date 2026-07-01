import Link from 'next/link';
import type { ReactNode } from 'react';

type SecurityCardProps = {
  title: string;
  description: string;
  badge?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
};

export function SecurityCard({ title, description, badge, children, footer }: SecurityCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {badge}
      </div>
      {children}
      {footer ? <div className="border-t border-border pt-4">{footer}</div> : null}
    </section>
  );
}

export function SecurityStatusBadge({ active, activeLabel, inactiveLabel }: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-neutral-100 text-neutral-600'
      }`}
    >
      {active ? (activeLabel ?? 'فعال') : (inactiveLabel ?? 'غیرفعال')}
    </span>
  );
}

export function SecurityCardLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  );
}
