import { type ILoginHardeningPort, type LoginHardeningContext } from '@hivork/application';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NoopLoginHardeningPort implements ILoginHardeningPort {
  async assertLoginAllowed(_context: LoginHardeningContext): Promise<void> {
    // Captcha disabled — no-op
  }

  async recordPasswordLoginFailure(_clientIp: string | undefined): Promise<void> {
    // Captcha disabled — no-op
  }
}
