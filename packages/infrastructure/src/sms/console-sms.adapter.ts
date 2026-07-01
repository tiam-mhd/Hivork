import type { ISmsPort } from '@hivork/application';
import { Injectable } from '@nestjs/common';

/** Dev SMS adapter — logs OTP/messages to stdout (Mailhog wiring in TASK-035). */
@Injectable()
export class ConsoleSmsAdapter implements ISmsPort {
  async send(to: string, message: string): Promise<void> {
    console.log(`[SMS] to=${to} message=${message}`);
  }
}
