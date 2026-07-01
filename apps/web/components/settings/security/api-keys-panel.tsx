'use client';

import {
  TENANT_API_KEY_SCOPES,
  type ApiKeyScopeDto,
  type CreateTenantApiKeyResponseDto,
  type TenantApiKeyListItemDto,
} from '@hivork/contracts';
import { Button, Input, Label } from '@hivork/ui';
import { useCallback, useEffect, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { usePermission } from '@/hooks/use-permission';
import { formatIsoDateAsJalali } from '@/lib/i18n';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';
import {
  API_KEY_CREATE_PERMISSION,
  API_KEY_REVOKE_PERMISSION,
  API_KEY_VIEW_PERMISSION,
  createTenantApiKey,
  fetchTenantApiKeys,
  isApiKeysApiError,
  revokeTenantApiKey,
} from '@/lib/settings/api-keys';

const SCOPE_LABELS_FA: Record<ApiKeyScopeDto, string> = {
  'installments.read': 'خواندن اقساط',
  'customers.read': 'خواندن مشتریان',
  'webhooks.receive': 'دریافت webhook',
};

export function ApiKeysPanel() {
  return (
    <RequirePermission permission={API_KEY_VIEW_PERMISSION} fallback={<NoPermissionPage required={API_KEY_VIEW_PERMISSION} />}>
      <ApiKeysPanelContent />
    </RequirePermission>
  );
}

function ApiKeysPanelContent() {
  const canCreate = usePermission(API_KEY_CREATE_PERMISSION);
  const canRevoke = usePermission(API_KEY_REVOKE_PERMISSION);
  const [items, setItems] = useState<TenantApiKeyListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreateTenantApiKeyResponseDto | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<TenantApiKeyListItemDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTenantApiKeys({ limit: 50 });
      setItems(result.items);
    } catch (err) {
      if (isApiKeysApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('بارگذاری کلیدهای API ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">کلیدهای API</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            کلیدهای یکپارچه‌سازی خارجی — secret فقط یک‌بار پس از ایجاد نمایش داده می‌شود.
          </p>
        </div>
        {canCreate ? (
          <Button type="button" onClick={() => setShowCreate(true)}>
            ایجاد کلید جدید
          </Button>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <Button type="button" variant="outline" className="mt-3" onClick={() => void load()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-neutral-100" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-medium">هنوز کلید API ایجاد نکرده‌اید</p>
          <p className="mt-1 text-sm text-muted-foreground">
            برای اتصال ERP یا webhook یک کلید با scope محدود بسازید.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-right">
              <tr>
                <th className="px-4 py-3 font-medium">نام</th>
                <th className="px-4 py-3 font-medium">پیشوند</th>
                <th className="px-4 py-3 font-medium">Scopes</th>
                <th className="px-4 py-3 font-medium">آخرین استفاده</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                {canRevoke ? <th className="px-4 py-3 font-medium">عملیات</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                    {item.keyPrefix}••••
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.scopes.map((scope) => (
                        <span key={scope} className="rounded bg-muted px-2 py-0.5 text-xs">
                          {SCOPE_LABELS_FA[scope as ApiKeyScopeDto] ?? scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.lastUsedAt
                      ? formatIsoDateAsJalali(item.lastUsedAt)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  {canRevoke ? (
                    <td className="px-4 py-3">
                      {item.status === 'active' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRevokeTarget(item)}
                        >
                          لغو
                        </Button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate ? (
        <CreateApiKeyDialog
          onClose={() => setShowCreate(false)}
          onCreated={(key) => {
            setShowCreate(false);
            setCreatedKey(key);
            void load();
          }}
        />
      ) : null}

      {createdKey ? (
        <SecretRevealModal apiKey={createdKey} onClose={() => setCreatedKey(null)} />
      ) : null}

      {revokeTarget ? (
        <RevokeConfirmDialog
          item={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onRevoked={() => {
            setRevokeTarget(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: TenantApiKeyListItemDto['status'] }) {
  const labels = { active: 'فعال', revoked: 'لغو شده', expired: 'منقضی' };
  const styles = {
    active: 'bg-emerald-100 text-emerald-800',
    revoked: 'bg-neutral-100 text-neutral-600',
    expired: 'bg-amber-100 text-amber-900',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function CreateApiKeyDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (key: CreateTenantApiKeyResponseDto) => void;
}) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ApiKeyScopeDto[]>(['installments.read']);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (scope: ApiKeyScopeDto) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const created = await createTenantApiKey({
        name,
        scopes,
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      });
      onCreated(created);
    } catch (err) {
      if (isApiKeysApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('ایجاد کلید API ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
        <h2 className="text-lg font-semibold">ایجاد کلید API</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key-name">نام</Label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً ERP Integration"
              disabled={loading}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Scopes</legend>
            {TENANT_API_KEY_SCOPES.map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  disabled={loading}
                />
                {SCOPE_LABELS_FA[scope]}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key-expires">انقضا (اختیاری)</Label>
            <Input
              id="api-key-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={loading}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-3">
            <Button type="button" disabled={loading || !name.trim() || scopes.length === 0} onClick={() => void submit()}>
              {loading ? 'در حال ایجاد…' : 'ایجاد'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              انصراف
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function SecretRevealModal({
  apiKey,
  onClose,
}: {
  apiKey: CreateTenantApiKeyResponseDto;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-amber-950">کلید API ایجاد شد</h2>
        <p className="mt-2 text-sm text-amber-900">
          این کلید فقط یک‌بار نمایش داده می‌شود. الآن کپی کنید و در جای امن ذخیره کنید.
        </p>
        <code className="mt-4 block break-all rounded bg-white px-3 py-2 font-mono text-sm" dir="ltr">
          {apiKey.key}
        </code>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void copy()}>
            {copied ? 'کپی شد' : 'کپی کلید'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </dialog>
  );
}

function RevokeConfirmDialog({
  item,
  onClose,
  onRevoked,
}: {
  item: TenantApiKeyListItemDto;
  onClose: () => void;
  onRevoked: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await revokeTenantApiKey(item.id);
      onRevoked();
    } catch (err) {
      if (isApiKeysApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('لغو کلید API ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
        <h2 className="text-lg font-semibold">لغو کلید API</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          کلید «{item.name}» بلافاصله غیرفعال می‌شود. این عمل قابل بازگشت نیست.
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 flex gap-3">
          <Button type="button" variant="destructive" disabled={loading} onClick={() => void confirm()}>
            {loading ? 'در حال لغو…' : 'لغو کلید'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </dialog>
  );
}
