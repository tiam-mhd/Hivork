import * as React from 'react';

import { HIVORK_CONTROL_CLASS, hivorkControlBaseClass } from './lib/control-styles.js';
import { cn } from './lib/utils.js';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          hivorkControlBaseClass,
          HIVORK_CONTROL_CLASS,
          'h-10 px-3 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
