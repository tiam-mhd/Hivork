import type { CaptchaVerifyResult, ICaptchaVerifier } from '@hivork/application';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NoopCaptchaVerifier implements ICaptchaVerifier {
  async verify(_token: string, _remoteIp?: string): Promise<CaptchaVerifyResult> {
    return { success: true };
  }
}
