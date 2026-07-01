import * as React from 'react';

import { HIVORK_CONTROL_CLASS, hivorkControlBaseClass } from './lib/control-styles.js';
import { cn } from './lib/utils.js';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(hivorkControlBaseClass, HIVORK_CONTROL_CLASS, 'px-3 py-2', className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
