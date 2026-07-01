import * as React from 'react';

import { HIVORK_CONTROL_CLASS, hivorkControlBaseClass } from './lib/control-styles.js';
import { cn } from './lib/utils.js';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(hivorkControlBaseClass, HIVORK_CONTROL_CLASS, 'h-10 px-3', className)}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = 'Select';
