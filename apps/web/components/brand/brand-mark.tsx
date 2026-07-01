import { cn } from '@hivork/ui';

import { HivorkLogo } from './hivork-logo';

type BrandMarkProps = {
  subtitle?: string;
  logoSize?: number;
  showWordmark?: boolean;
  className?: string;
  compact?: boolean;
};

export function BrandMark({
  subtitle,
  logoSize = 36,
  showWordmark = true,
  className,
  compact = false,
}: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-3', compact ? 'gap-2' : 'gap-3', className)}>
      <HivorkLogo size={logoSize} priority />
      {showWordmark ? (
        <div className="min-w-0">
          <p
            className={cn(
              'font-bold tracking-tight text-sidebar-brand',
              compact ? 'text-base' : 'text-lg',
            )}
          >
            Hivork
          </p>
          {subtitle ? (
            <p className="text-xs text-sidebar-brand-muted">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
