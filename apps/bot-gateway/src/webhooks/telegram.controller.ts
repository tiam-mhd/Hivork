import { HandleTelegramWebhookUseCase } from '@hivork/application';
import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

@Controller('webhooks')
export class TelegramWebhookController {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly telegramWebhookUseCase: HandleTelegramWebhookUseCase,
  ) {}

  @Post('telegram')
  async receiveTelegramWebhook(
    @Headers('x-telegram-bot-api-secret-token') secretToken: string | undefined,
    @Body() body: unknown,
  ): Promise<{ ok: true }> {
    this.verifySecretToken(secretToken);
    return this.telegramWebhookUseCase.execute({ update: body });
  }

  private verifySecretToken(secretToken: string | undefined): void {
    const configured = this.appConfig.telegramWebhookSecret;

    if (configured) {
      if (secretToken !== configured) {
        throw new UnauthorizedException('Invalid webhook secret');
      }
      return;
    }

    if (this.appConfig.nodeEnv === 'development' && secretToken === 'dev') {
      return;
    }

    throw new UnauthorizedException('Webhook secret required');
  }
}
