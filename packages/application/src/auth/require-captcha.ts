import { ApplicationError } from '../errors/application.error.js';
import type { ICaptchaVerifier } from './ports/captcha.port.js';

export type CaptchaPolicyConfig = {
  enabled: boolean;
  bypassToken: string;
};

export type RequireCaptchaInput = {
  captchaToken?: string;
  clientIp?: string;
  bypassToken?: string;
  /** When true, captcha is required even if globally disabled (IFP-012 failure synergy). */
  forceRequired?: boolean;
};

export type RequireCaptchaDeps = {
  verifier: ICaptchaVerifier;
  config: CaptchaPolicyConfig;
};

export async function requireCaptcha(
  deps: RequireCaptchaDeps,
  input: RequireCaptchaInput,
): Promise<void> {
  const mustVerify = deps.config.enabled || input.forceRequired === true;
  if (!mustVerify) {
    return;
  }

  if (isCaptchaBypass(input.bypassToken, deps.config.bypassToken)) {
    return;
  }

  if (!input.captchaToken?.trim()) {
    throw new ApplicationError(
      'AUTH_CAPTCHA_REQUIRED',
      'Captcha verification is required.',
      400,
    );
  }

  let result: Awaited<ReturnType<ICaptchaVerifier['verify']>>;
  try {
    result = await deps.verifier.verify(input.captchaToken.trim(), input.clientIp);
  } catch {
    throw new ApplicationError(
      'CAPTCHA_SERVICE_UNAVAILABLE',
      'Captcha verification is temporarily unavailable.',
      503,
    );
  }

  if (!result.success) {
    throw new ApplicationError(
      'AUTH_CAPTCHA_INVALID',
      'Captcha verification failed.',
      400,
    );
  }
}

export function isCaptchaBypass(provided: string | undefined, expected: string): boolean {
  if (!provided?.trim() || !expected.trim()) {
    return false;
  }
  return provided.trim() === expected.trim();
}
