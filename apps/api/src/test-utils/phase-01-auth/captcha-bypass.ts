export const CAPTCHA_BYPASS_HEADER = 'x-captcha-bypass';

export const CAPTCHA_BYPASS_HEADERS: Record<string, string> = {
  [CAPTCHA_BYPASS_HEADER]: process.env.CAPTCHA_BYPASS_TOKEN ?? 'test-bypass',
};
