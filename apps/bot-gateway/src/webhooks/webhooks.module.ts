import { HandleTelegramWebhookUseCase } from '@hivork/application';
import { Module } from '@nestjs/common';

import { TelegramWebhookController } from './telegram.controller';

@Module({
  controllers: [TelegramWebhookController],
  providers: [HandleTelegramWebhookUseCase],
})
export class WebhooksModule {}
