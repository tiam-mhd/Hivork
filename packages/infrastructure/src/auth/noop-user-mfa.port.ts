import { type IUserMfaPort, type UserMfaLoginStepUp } from '@hivork/application';
import { Injectable } from '@nestjs/common';

const DISABLED_STEP_UP: UserMfaLoginStepUp = {
  required: false,
  methods: [],
  otpEnabled: false,
  totpEnabled: false,
};

@Injectable()
export class NoopUserMfaPort implements IUserMfaPort {
  async getLoginStepUp(_userId: string): Promise<UserMfaLoginStepUp> {
    return DISABLED_STEP_UP;
  }

  async isOtpStepUpEnabled(_userId: string): Promise<boolean> {
    return false;
  }

  async verifyTotp(_userId: string, _code: string): Promise<{ ok: false; reason: 'invalid' }> {
    return { ok: false, reason: 'invalid' };
  }
}
