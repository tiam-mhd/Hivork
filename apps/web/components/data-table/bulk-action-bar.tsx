'use client';

import type { BulkActionVariant } from '@hivork/contracts/ui';
import { Button, cn } from '@hivork/ui';
import { formatPersianDigits } from '@hivork/i18n';
import type { ComponentType } from 'react';

import { usePermissions } from '@/hooks/use-permission';
import { hasPermission } from '@/lib/navigation/admin-menu';

export type BulkAction<T = unknown> = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  variant?: BulkActionVariant;
  permission?: string;
  requiresConfirm?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  onExecute: (selectedRows: T[]) => Promise<void>;
};

type BulkActionBarProps<T> = {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction<T>[];
  isExecuting?: boolean;
  onActionClick: (action: BulkAction<T>) => void;
};

export function BulkActionBar<T>({
  selectedCount,
  onClearSelection,
  actions,
  isExecuting = false,
  onActionClick,
}: BulkActionBarProps<T>) {
  const permissions = usePermissions();

  if (selectedCount <= 0) {
    return null;
  }

  const visibleActions = actions.filter(
    (action) => !action.permission || hasPermission(permissions, action.permission),
  );
  const hasPermittedActions = visibleActions.length > 0;

  return (
    <div
      className={cn(
        'sticky bottom-0 z-30 -mx-1 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm',
        'supports-[backdrop-filter]:bg-card/80',
      )}
      role="region"
      aria-label="عملیات گروهی"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-foreground">
            {formatPersianDigits(selectedCount)} مورد انتخاب شده
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isExecuting}
            onClick={onClearSelection}
          >
            لغو انتخاب
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {!hasPermittedActions ? (
            <span className="text-sm text-muted-foreground">عملیات مجاز نیست</span>
          ) : (
            visibleActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  type="button"
                  size="sm"
                  variant={
                    action.variant === 'destructive'
                      ? 'destructive'
                      : action.variant === 'outline'
                        ? 'outline'
                        : 'default'
                  }
                  disabled={isExecuting}
                  onClick={() => onActionClick(action)}
                >
                  {Icon ? <Icon className="me-1.5 size-4" aria-hidden /> : null}
                  {action.label}
                </Button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
