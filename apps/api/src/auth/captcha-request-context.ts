import type { Request } from 'express';

export const CAPTCHA_TOKEN_HEADER = 'x-captcha-token';
export const CAPTCHA_BYPASS_HEADER = 'x-captcha-bypass';

export type CaptchaRequestContext = {
  captchaToken?: string;
  captchaBypassToken?: string;
};

export function readCaptchaRequestContext(
  req: Request,
  bodyToken?: string,
  headerToken?: string,
): CaptchaRequestContext {
  const bypassHeader = req.headers[CAPTCHA_BYPASS_HEADER];
  return {
    captchaToken: bodyToken ?? headerToken,
    captchaBypassToken: typeof bypassHeader === 'string' ? bypassHeader : undefined,
  };
}
