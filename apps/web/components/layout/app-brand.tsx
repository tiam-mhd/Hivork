import { cn } from '@hivork/ui';

import { HivorkLogo } from '@/components/brand/hivork-logo';

type AppBrandProps = {
  subtitle?: string;
  className?: string;
  logoSize?: number;
};

export function AppBrand({ subtitle, className, logoSize = 56 }: AppBrandProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 text-center', className)}>
      <HivorkLogo size={logoSize} priority className="drop-shadow-sm" />
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">Hivork</p>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
