'use client';

import { cn } from '@hivork/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BrandMark } from '@/components/brand/brand-mark';
import { useFilteredAdminMenu } from '@/hooks/use-permission';
import type { NavItem } from '@/lib/navigation/admin-menu';

type AdminSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function AdminSidebar({ className, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const menu = useFilteredAdminMenu();

  return (
    <nav
      aria-label="ناوبری پنل فروشنده"
      className={cn('flex h-full flex-col border-e border-sidebar-border bg-sidebar', className)}
    >
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link href="/admin/dashboard" onClick={onNavigate} className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark subtitle="پنل فروشنده" logoSize={32} />
        </Link>
      </div>

      <ul className="flex flex-1 flex-col gap-1 p-3">
        {menu.map((item) => (
          <li key={item.id}>
            {item.children && item.children.length > 0 ? (
              <NavGroup item={item} pathname={pathname} onNavigate={onNavigate} />
            ) : (
              <NavLink
                href={item.href!}
                label={item.label}
                active={isRouteActive(pathname, item.href!)}
                onNavigate={onNavigate}
              />
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const groupActive = item.children?.some((child) => isRouteActive(pathname, child.href)) ?? false;

  return (
    <details className="group" open={groupActive}>
      <summary
        className={cn(
          'layout-nav-item flex min-h-11 cursor-pointer list-none items-center rounded-md px-3 text-sm font-medium transition-colors marker:content-none',
          groupActive
            ? 'bg-sidebar-nav-active text-sidebar-nav-active-fg'
            : 'text-sidebar-nav-default hover:bg-sidebar-nav-hover hover:text-sidebar-nav-hover-fg',
        )}
      >
        {item.label}
      </summary>
      <ul className="mt-1 flex flex-col gap-1 border-e-2 border-sidebar-group-border pe-2 ps-3">
        {item.children?.map((child) => (
          <li key={child.id}>
            <NavLink
              href={child.href}
              label={child.label}
              active={isRouteActive(pathname, child.href)}
              nested
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </details>
  );
}

function NavLink({
  href,
  label,
  active,
  nested = false,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'layout-nav-item flex min-h-11 items-center rounded-md px-3 text-sm transition-colors',
        nested ? 'font-normal' : 'font-medium',
        active
          ? 'bg-sidebar-nav-active font-medium text-sidebar-nav-active-fg'
          : 'text-sidebar-nav-default hover:bg-sidebar-nav-hover hover:text-sidebar-nav-hover-fg',
      )}
    >
      {label}
    </Link>
  );
}

function isRouteActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }
  if (href === '/admin/dashboard') {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}
