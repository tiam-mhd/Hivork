'use client';

import type { TenantResponseDto } from '@hivork/contracts';

import { BranchSwitcher } from './branch-switcher';
import { TenantBadge } from './tenant-badge';
import { UserMenu } from './user-menu';

import { BrandMark } from '@/components/brand/brand-mark';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { NotificationBell } from '@/components/layout/notification-bell';
import { ThemeToggle } from '@/components/layout/theme-toggle';

type AdminHeaderProps = {
  tenant: TenantResponseDto;
  staffName: string;
  branchSwitcher: {
    branches: Parameters<typeof BranchSwitcher>[0]['branches'];
    activeBranchId: string | null;
    activeBranchName: string | null;
    loading: boolean;
    onChange: (branchId: string) => void;
  };
  onLogout: () => Promise<void>;
  onOpenMobileNav: () => void;
};

export function AdminHeader({
  tenant,
  staffName,
  branchSwitcher,
  onLogout,
  onOpenMobileNav,
}: AdminHeaderProps) {
  const showTrialBanner = tenant.status === 'trial';

  return (
    <header className="layout-header sticky top-0 z-40 border-b">
      {tenant.status === 'suspended' ? (
        <div className="border-b border-banner-suspended-border bg-banner-suspended px-4 py-2 text-center text-sm text-banner-suspended-foreground">
          حساب فروشگاه معلق است. برخی امکانات محدود شده‌اند.
        </div>
      ) : null}

      <div className="flex min-h-header items-center gap-3 px-4 py-2">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-md border border-header-border hover:bg-header-menu-hover lg:hidden"
          aria-label="باز کردن منو"
          onClick={onOpenMobileNav}
        >
          ☰
        </button>

        <div className="lg:hidden">
          <BrandMark showWordmark={false} logoSize={28} />
        </div>

        <TenantBadge tenant={tenant} className="hidden sm:flex" />

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher className="hidden md:inline-flex" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <NotificationBell />
          <BranchSwitcher
            branches={branchSwitcher.branches}
            activeBranchId={branchSwitcher.activeBranchId}
            activeBranchName={branchSwitcher.activeBranchName}
            loading={branchSwitcher.loading}
            onChange={branchSwitcher.onChange}
          />
          <UserMenu staffName={staffName} onLogout={onLogout} />
        </div>
      </div>

      {showTrialBanner ? (
        <div className="border-t border-banner-trial-border bg-banner-trial px-4 py-1.5 text-center text-xs text-banner-trial-foreground">
          دوره آزمایشی فعال است
          {tenant.trialEndsAt ? ` — پایان: ${new Date(tenant.trialEndsAt).toLocaleDateString('fa-IR')}` : ''}
        </div>
      ) : null}
    </header>
  );
}
