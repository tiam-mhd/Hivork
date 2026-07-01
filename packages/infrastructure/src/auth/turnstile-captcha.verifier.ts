import type { CaptchaVerifyResult, ICaptchaVerifier } from '@hivork/application';
import { Injectable } from '@nestjs/common';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5_000;

type TurnstileVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

@Injectable()
export class TurnstileCaptchaVerifier implements ICaptchaVerifier {
  constructor(private readonly secretKey: string) {}

  async verify(token: string, remoteIp?: string): Promise<CaptchaVerifyResult> {
    const body = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    });
    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    try {
      const response = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Turnstile HTTP ${response.status}`);
      }

      const payload = (await response.json()) as TurnstileVerifyResponse;
      if (payload.success) {
        return { success: true };
      }

      return {
        success: false,
        errorCodes: payload['error-codes'] ?? ['unknown'],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
