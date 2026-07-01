'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as React from 'react';

import { HIVORK_CHECKBOX_CLASS } from './lib/control-styles.js';
import { cn } from './lib/utils.js';

export type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(HIVORK_CHECKBOX_CLASS, className)}
    {...props}
  />
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
