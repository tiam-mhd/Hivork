'use client';

import type { PasswordLoginResponseDto } from '@hivork/contracts';
import { formatJalaliDate } from '@hivork/i18n';
import { Button, Checkbox, Input, Label, Select } from '@hivork/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { CaptchaWidget, type CaptchaWidgetHandle } from '@/components/auth/captcha-widget';
import type { TenantOption } from '@/components/auth/tenant-select-step';
import { CAPTCHA_I18N, isCaptchaEnabledClient } from '@/lib/auth/captcha-config';
import { LOGIN_PASSWORD_I18N } from '@/lib/auth/login-password-i18n';
import { mapPasswordLoginError } from '@/lib/auth/map-password-login-error';
import { maskIpForDisplay } from '@/lib/auth/mask-ip';
import { setNewIpAlertPending } from '@/lib/auth/new-ip-alert';
import { parseTenantOptions } from '@/lib/auth/parse-tenant-options';
import { isPasswordLoginApiError, passwordLogin } from '@/lib/auth/password-login';
import { validatePasswordLoginForm } from '@/lib/auth/password-login-form.schema';
import { useCountdown } from '@/lib/auth/use-countdown';

type PasswordLoginSession = Extract<PasswordLoginResponseDto, { kind: 'session' }>;

type PasswordLoginFormProps = {
  onSession: (session: PasswordLoginSession) => Promise<void>;
};

export function PasswordLoginForm({ onSession }: PasswordLoginFormProps) {
  const router = useRouter();
  const phoneId = useId();
  const passwordId = useId();
  const tenantId = useId();
  const rememberId = useId();
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const captchaRef = useRef<CaptchaWidgetHandle>(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'phone' | 'password' | 'tenantSlug', string>>>(
    {},
  );
  const [tenantOptions, setTenantOptions] = useState<TenantOption[] | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [lastLoginNotice, setLastLoginNotice] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [showForgotOnLockout, setShowForgotOnLockout] = useState(false);

  const lockSeconds = useCountdown(lockedUntil);
  const rateLimitSeconds = useCountdown(rateLimitUntil);

  const submitDisabled =
    loading || lockSeconds > 0 || rateLimitSeconds > 0 || !phone.trim() || !password.trim();

  const submitLogin = useCallback(
    async (values: {
      phone: string;
      password: string;
      tenantSlug?: string;
      rememberMe?: boolean;
      captchaToken?: string;
    }) => {
      setLoading(true);
      setError(null);
      setNetworkError(false);
      setShowForgotOnLockout(false);
      setLastLoginNotice(null);

      try {
        const result = await passwordLogin({
          phone: values.phone,
          password: values.password,
          tenantSlug: values.tenantSlug || undefined,
          rememberMe: values.rememberMe ?? false,
          captchaToken: values.captchaToken,
        });

        if (result.kind === 'mfa_required') {
          const methodsParam = result.methods.join(',');
          router.push(
            `/login/mfa?token=${encodeURIComponent(result.mfaToken)}&methods=${encodeURIComponent(methodsParam)}`,
          );
          return;
        }

        if (result.kind === 'must_change_password') {
          router.push(
            `/auth/change-password?token=${encodeURIComponent(result.changePasswordToken)}`,
          );
          return;
        }

        if (result.lastLogin) {
          const dateLabel = formatJalaliDate(new Date(result.lastLogin.at));
          const device = result.lastLogin.deviceLabel;
          const maskedIp = result.lastLogin.ip ? maskIpForDisplay(result.lastLogin.ip) : undefined;
          const locationLabel = device && maskedIp ? `${device} (${maskedIp})` : device ?? maskedIp;
          setLastLoginNotice(
            locationLabel
              ? `${LOGIN_PASSWORD_I18N.lastLoginPrefix} ${dateLabel} ${LOGIN_PASSWORD_I18N.lastLoginFrom} ${locationLabel}`
              : `${LOGIN_PASSWORD_I18N.lastLoginPrefix} ${dateLabel}`,
          );
        }

        if (result.newIpAlert) {
          setNewIpAlertPending(true);
        }

        await onSession(result);
      } catch (err) {
        if (isPasswordLoginApiError(err) && err.code === 'NEED_TENANT_SLUG' && err.httpStatus === 409) {
          const tenants = parseTenantOptions(err.details);
          if (tenants.length > 0) {
            setTenantOptions(tenants);
            setError(LOGIN_PASSWORD_I18N.tenantHelp);
            return;
          }
        }

        const mapped = mapPasswordLoginError(err);
        setError(mapped.message);
        if (mapped.clearPassword) {
          setPassword('');
          passwordInputRef.current?.focus();
        }
        if (mapped.lockedUntil) {
          setLockedUntil(mapped.lockedUntil);
        }
        if (mapped.showForgotPasswordLink) {
          setShowForgotOnLockout(true);
        }
        if (mapped.rateLimitUntil) {
          setRateLimitUntil(mapped.rateLimitUntil);
        }
        if (mapped.resetCaptcha) {
          captchaRef.current?.reset();
        }
        if (!isPasswordLoginApiError(err)) {
          setNetworkError(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [onSession, router],
  );

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    setFieldErrors({});

    const validation = validatePasswordLoginForm({
      phone,
      password,
      tenantSlug: tenantSlug || undefined,
      rememberMe,
    });

    if (!validation.success) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    if (tenantOptions && !validation.data.tenantSlug) {
      setFieldErrors({ tenantSlug: LOGIN_PASSWORD_I18N.tenantHelp });
      return;
    }

    if (isCaptchaEnabledClient() && !captchaToken) {
      setError(CAPTCHA_I18N.required);
      return;
    }

    void submitLogin({
      ...validation.data,
      captchaToken: captchaToken ?? undefined,
    });
  }

  function handleTenantChange(nextSlug: string) {
    setTenantSlug(nextSlug);
    setFieldErrors((prev) => ({ ...prev, tenantSlug: undefined }));

    if (!nextSlug || loading) {
      return;
    }

    const validation = validatePasswordLoginForm({
      phone,
      password,
      tenantSlug: nextSlug,
      rememberMe,
    });

    if (validation.success) {
      if (isCaptchaEnabledClient() && !captchaToken) {
        setError(CAPTCHA_I18N.required);
        return;
      }
      void submitLogin({
        ...validation.data,
        captchaToken: captchaToken ?? undefined,
      });
    }
  }

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  return (
    <form
      id="login-panel-password"
      role="tabpanel"
      aria-labelledby="login-tab-password"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <p className="text-sm text-muted-foreground">{LOGIN_PASSWORD_I18N.title}</p>

      {lastLoginNotice ? (
        <div
          className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800"
          role="status"
        >
          {lastLoginNotice}
        </div>
      ) : null}

      {lockSeconds > 0 ? (
        <div
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          role="alert"
        >
          {LOGIN_PASSWORD_I18N.accountLocked}{' '}
          {lockSeconds >= 60
            ? `${Math.ceil(lockSeconds / 60)} دقیقه دیگر دوباره تلاش کنید.`
            : `${lockSeconds} ثانیه دیگر دوباره تلاش کنید.`}
          {showForgotOnLockout ? (
            <p className="mt-2">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {LOGIN_PASSWORD_I18N.accountLockedForgot}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {rateLimitSeconds > 0 ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {LOGIN_PASSWORD_I18N.rateLimited} {rateLimitSeconds} ثانیه صبر کنید.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
          {networkError ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 min-h-9 w-full"
              onClick={() => handleSubmit()}
            >
              {LOGIN_PASSWORD_I18N.retry}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={phoneId}>{LOGIN_PASSWORD_I18N.phoneLabel}</Label>
        <Input
          id={phoneId}
          type="tel"
          inputMode="tel"
          autoComplete="username tel"
          aria-label={LOGIN_PASSWORD_I18N.phoneLabel}
          aria-invalid={Boolean(fieldErrors.phone)}
          aria-describedby={`${phoneId}-help`}
          placeholder={LOGIN_PASSWORD_I18N.phonePlaceholder}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          dir="ltr"
          className="min-h-11 text-lg"
          disabled={loading || lockSeconds > 0 || rateLimitSeconds > 0}
        />
        <p id={`${phoneId}-help`} className="text-xs text-muted-foreground">
          {LOGIN_PASSWORD_I18N.phoneHelp}
        </p>
        {fieldErrors.phone ? (
          <p className="text-sm text-red-600" role="alert">
            {fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>{LOGIN_PASSWORD_I18N.passwordLabel}</Label>
        <div className="relative">
          <Input
            ref={passwordInputRef}
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-label={LOGIN_PASSWORD_I18N.passwordLabel}
            aria-invalid={Boolean(fieldErrors.password)}
            placeholder={LOGIN_PASSWORD_I18N.passwordPlaceholder}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            dir="ltr"
            className="min-h-11 pe-24 text-lg"
            disabled={loading || lockSeconds > 0 || rateLimitSeconds > 0}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute inset-y-0 end-1 my-auto min-h-9 px-2 text-xs"
            onClick={() => setShowPassword((current) => !current)}
            aria-pressed={showPassword}
            aria-label={showPassword ? LOGIN_PASSWORD_I18N.hidePassword : LOGIN_PASSWORD_I18N.showPassword}
          >
            {showPassword ? LOGIN_PASSWORD_I18N.hidePassword : LOGIN_PASSWORD_I18N.showPassword}
          </Button>
        </div>
        {fieldErrors.password ? (
          <p className="text-sm text-red-600" role="alert">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      {tenantOptions ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={tenantId}>{LOGIN_PASSWORD_I18N.tenantLabel}</Label>
          <Select
            id={tenantId}
            value={tenantSlug}
            aria-invalid={Boolean(fieldErrors.tenantSlug)}
            aria-label={LOGIN_PASSWORD_I18N.tenantLabel}
            disabled={loading}
            onChange={(event) => handleTenantChange(event.target.value)}
            className="min-h-11"
          >
            <option value="">{LOGIN_PASSWORD_I18N.tenantHelp}</option>
            {tenantOptions.map((tenant) => (
              <option key={tenant.slug} value={tenant.slug}>
                {tenant.name}
              </option>
            ))}
          </Select>
          {fieldErrors.tenantSlug ? (
            <p className="text-sm text-red-600" role="alert">
              {fieldErrors.tenantSlug}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id={rememberId}
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            disabled={loading}
            aria-describedby={`${rememberId}-help`}
          />
          <Label htmlFor={rememberId} id={`${rememberId}-label`} className="cursor-pointer font-normal">
            {LOGIN_PASSWORD_I18N.rememberMe}
          </Label>
        </div>
        <p id={`${rememberId}-help`} className="text-xs text-muted-foreground ps-6">
          {LOGIN_PASSWORD_I18N.rememberMeHelp}
        </p>
      </div>

      <CaptchaWidget ref={captchaRef} onTokenChange={setCaptchaToken} disabled={loading} />

      <div className="flex justify-end">
        <Link
          href="/auth/forgot-password"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {LOGIN_PASSWORD_I18N.forgot}
        </Link>
      </div>

      <Button type="submit" className="min-h-11 w-full" disabled={submitDisabled}>
        {loading ? LOGIN_PASSWORD_I18N.submitting : LOGIN_PASSWORD_I18N.submit}
      </Button>
    </form>
  );
}
