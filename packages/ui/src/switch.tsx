'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

import { HIVORK_SWITCH_CLASS } from './lib/control-styles.js';
import { cn } from './lib/utils.js';

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

export const Switch = React.forwardRef<React.ComponentRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root className={cn(HIVORK_SWITCH_CLASS, className)} {...props} ref={ref}>
      <SwitchPrimitive.Thumb className="hivork-switch-thumb" />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = SwitchPrimitive.Root.displayName;
