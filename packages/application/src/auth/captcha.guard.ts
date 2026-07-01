import { requireCaptcha, type CaptchaPolicyConfig, type RequireCaptchaInput } from './require-captcha.js';
import type { ICaptchaVerifier } from './ports/captcha.port.js';

export class CaptchaGuard {
  constructor(
    private readonly verifier: ICaptchaVerifier,
    private readonly config: CaptchaPolicyConfig,
  ) {}

  async require(input: RequireCaptchaInput): Promise<void> {
    await requireCaptcha(
      {
        verifier: this.verifier,
        config: this.config,
      },
      input,
    );
  }
}
