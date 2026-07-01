import { cn } from '@hivork/ui';
import Image from 'next/image';

export const HIVORK_LOGO_SRC = '/brand/hivork-logo.webp';

type HivorkLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function HivorkLogo({ size = 36, className, priority = false }: HivorkLogoProps) {
  return (
    <Image
      src={HIVORK_LOGO_SRC}
      alt="Hivork"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      priority={priority}
    />
  );
}
