'use client';

import { Input, Label } from '@hivork/ui';
import { useMemo, useState } from 'react';

import {
  PERMISSION_MODULE_GROUPS,
  type PermissionModuleGroup,
} from '@/lib/roles/permission-catalog';
import {
  moduleSelectionState,
  toggleModulePermissions,
  togglePermission,
} from '@/lib/roles/role-form.schema';

type PermissionMatrixProps = {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  installmentsModuleEnabled?: boolean;
  error?: string;
};

function ModuleSection({
  group,
  value,
  onChange,
  disabled,
  moduleDisabled,
}: {
  group: PermissionModuleGroup;
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  moduleDisabled?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const moduleCodes = group.permissions.map((item) => item.code);
  const selection = moduleSelectionState(value, moduleCodes);

  return (
    <section className="rounded-lg border border-neutral-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
        <button
          type="button"
          className="text-sm font-medium text-neutral-900"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? '▼' : '◀'} {group.label}
        </button>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            className="size-4 rounded border-neutral-300"
            checked={selection === 'all'}
            ref={(element) => {
              if (element) {
                element.indeterminate = selection === 'partial';
              }
            }}
            disabled={disabled || moduleDisabled}
            onChange={(event) =>
              onChange(toggleModulePermissions(value, moduleCodes, event.target.checked))
            }
          />
          انتخاب همه
        </label>
      </div>

      {open ? (
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {group.permissions.map((permission) => (
            <label
              key={permission.code}
              className={`flex items-start gap-2 text-sm ${
                moduleDisabled ? 'text-neutral-400' : 'text-neutral-800'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-neutral-300"
                checked={value.includes(permission.code)}
                disabled={disabled || moduleDisabled}
                onChange={(event) =>
                  onChange(togglePermission(value, permission.code, event.target.checked))
                }
              />
              <span className="flex flex-col">
                <span>{permission.label}</span>
                <span className="font-mono text-xs text-neutral-500" dir="ltr">
                  {permission.code}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {moduleDisabled ? (
        <p className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500">
          این ماژول برای tenant فعال نیست.
        </p>
      ) : null}
    </section>
  );
}

export function PermissionMatrix({
  value,
  onChange,
  disabled = false,
  installmentsModuleEnabled = true,
  error,
}: PermissionMatrixProps) {
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return PERMISSION_MODULE_GROUPS;
    }

    return PERMISSION_MODULE_GROUPS.map((group) => ({
      ...group,
      permissions: group.permissions.filter(
        (permission) =>
          permission.label.toLowerCase().includes(query) ||
          permission.code.toLowerCase().includes(query),
      ),
    })).filter((group) => group.permissions.length > 0);
  }, [search]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="permission-search">جستجو در مجوزها</Label>
        <Input
          id="permission-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="نام یا کد مجوز..."
          disabled={disabled}
          autoComplete="off"
        />
      </div>

      {filteredGroups.map((group) => (
        <ModuleSection
          key={group.module}
          group={group}
          value={value}
          onChange={onChange}
          disabled={disabled}
          moduleDisabled={group.module === 'installments' && !installmentsModuleEnabled}
        />
      ))}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function PermissionMatrixReadonly({ permissions }: { permissions: string[] }) {
  const grouped = PERMISSION_MODULE_GROUPS.map((group) => ({
    ...group,
    permissions: group.permissions.filter((item) => permissions.includes(item.code)),
  })).filter((group) => group.permissions.length > 0);

  if (grouped.length === 0) {
    return <p className="text-sm text-neutral-500">مجوزی ثبت نشده است.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map((group) => (
        <section key={group.module} className="rounded-lg border border-neutral-200 p-4">
          <h3 className="mb-2 text-sm font-medium text-neutral-900">{group.label}</h3>
          <ul className="grid gap-1 text-sm text-neutral-700 sm:grid-cols-2">
            {group.permissions.map((permission) => (
              <li key={permission.code}>{permission.label}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
