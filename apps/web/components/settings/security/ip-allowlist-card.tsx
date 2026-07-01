'use client';

import { UpdateSecuritySettingsSchema, type SecuritySettingsDto } from '@hivork/contracts';
import { Button, Label } from '@hivork/ui';
import { useCallback, useEffect, useState } from 'react';

import { SecurityCard } from '@/components/settings/security/security-card';
import { usePermission } from '@/hooks/use-permission';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';
import {
  fetchTenantSecuritySettings,
  IP_ALLOWLIST_SETTINGS_PERMISSION,
  isSecuritySettingsApiError,
  patchTenantSecuritySettings,
} from '@/lib/settings/security-settings';

function parseCidrsText(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatCidrsText(cidrs: string[]): string {
  return cidrs.join('\n');
}

export function IpAllowlistCard() {
  const canEdit = usePermission(IP_ALLOWLIST_SETTINGS_PERMISSION);
  const [loading, setLoading] = useState(canEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [cidrsText, setCidrsText] = useState('');
  const [initial, setInitial] = useState<SecuritySettingsDto | null>(null);

  const load = useCallback(async () => {
    if (!canEdit) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const settings = await fetchTenantSecuritySettings();
      setInitial(settings);
      setEnabled(settings.ipAllowlist.enabled);
      setCidrsText(formatCidrsText(settings.ipAllowlist.cidrs));
    } catch (err) {
      if (isSecuritySettingsApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('بارگذاری تنظیمات IP ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!canEdit) {
    return null;
  }

  const isDirty =
    initial !== null &&
    (enabled !== initial.ipAllowlist.enabled ||
      formatCidrsText(parseCidrsText(cidrsText)) !== formatCidrsText(initial.ipAllowlist.cidrs));

  const save = async () => {
    setError(null);
    const cidrs = parseCidrsText(cidrsText);
    const parsed = UpdateSecuritySettingsSchema.safeParse({
      ipAllowlist: { enabled, cidrs },
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'داده‌های IP نامعتبر است.');
      return;
    }

    if (enabled && cidrs.length === 0) {
      setError('برای فعال‌سازی allowlist حداقل یک IP یا CIDR وارد کنید.');
      return;
    }

    setSaving(true);
    try {
      const updated = await patchTenantSecuritySettings(parsed.data);
      setInitial(updated);
      setToast('تنظیمات IP ذخیره شد.');
    } catch (err) {
      if (isSecuritySettingsApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('ذخیره تنظیمات IP ناموفق بود.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SecurityCard
      title="محدودیت IP ورود کارمندان"
      description="فقط از IPهای مشخص‌شده اجازه ورود staff داده می‌شود."
    >
      {toast ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {toast}
        </p>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-2">
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
          <div className="h-24 animate-pulse rounded bg-neutral-100" />
        </div>
      ) : error && !initial ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-red-600">{error}</p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            تلاش مجدد
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              disabled={saving}
            />
            فعال‌سازی محدودیت IP
          </label>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ip-allowlist-cidrs">آدرس‌های IP مجاز (هر خط یک IP یا CIDR)</Label>
            <textarea
              id="ip-allowlist-cidrs"
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
              placeholder={'192.168.1.0/24\n203.0.113.5'}
              value={cidrsText}
              onChange={(event) => setCidrsText(event.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              فقط IPv4 پشتیبانی می‌شود. حداکثر ۵۰ مورد.
            </p>
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="button" disabled={!isDirty || saving} onClick={() => void save()}>
            {saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات IP'}
          </Button>
        </div>
      )}
    </SecurityCard>
  );
}
