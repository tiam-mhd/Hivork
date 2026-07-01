'use client';

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, forwardRef } from 'react';

import { CAPTCHA_I18N, getCaptchaSiteKey, isCaptchaEnabledClient } from '@/lib/auth/captcha-config';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          size?: 'normal' | 'compact';
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
    onHivorkTurnstileLoad?: () => void;
  }
}

export type CaptchaWidgetHandle = {
  reset: () => void;
  getToken: () => string | null;
};

type CaptchaWidgetProps = {
  onTokenChange: (token: string | null) => void;
  disabled?: boolean;
};

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onHivorkTurnstileLoad';

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existing) {
      window.onHivorkTurnstileLoad = () => resolve();
      if (window.turnstile) {
        resolve();
      }
      return;
    }

    window.onHivorkTurnstileLoad = () => resolve();
    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(script);
  });
}

export const CaptchaWidget = forwardRef<CaptchaWidgetHandle, CaptchaWidgetProps>(
  function CaptchaWidget({ onTokenChange, disabled = false }, ref) {
    const containerId = useId().replace(/:/g, '');
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const tokenRef = useRef<string | null>(null);
    const [loading, setLoading] = useState(isCaptchaEnabledClient());
    const enabled = isCaptchaEnabledClient();
    const siteKey = getCaptchaSiteKey();

    const resetWidget = useCallback(() => {
      tokenRef.current = null;
      onTokenChange(null);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }, [onTokenChange]);

    useImperativeHandle(
      ref,
      () => ({
        reset: resetWidget,
        getToken: () => tokenRef.current,
      }),
      [resetWidget],
    );

    useEffect(() => {
      if (!enabled || !siteKey || disabled) {
        setLoading(false);
        return;
      }

      let cancelled = false;

      void loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) {
            return;
          }

          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }

          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            size: 'compact',
            theme: 'auto',
            callback: (token) => {
              tokenRef.current = token;
              onTokenChange(token);
            },
            'expired-callback': () => {
              tokenRef.current = null;
              onTokenChange(null);
            },
            'error-callback': () => {
              tokenRef.current = null;
              onTokenChange(null);
            },
          });
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [disabled, enabled, onTokenChange, siteKey]);

    if (!enabled || !siteKey) {
      return null;
    }

    return (
      <div className="flex flex-col gap-1">
        <div
          id={containerId}
          ref={containerRef}
          className="min-h-16"
          aria-live="polite"
          aria-busy={loading}
        />
        {loading ? (
          <p className="text-xs text-muted-foreground">{CAPTCHA_I18N.loading}</p>
        ) : null}
      </div>
    );
  },
);
