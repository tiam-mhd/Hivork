import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EnvConfig } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get port(): number {
    return this.config.get('BOT_GATEWAY_PORT', { infer: true });
  }

  get logLevel(): EnvConfig['LOG_LEVEL'] {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get nodeEnv(): EnvConfig['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get telegramWebhookSecret(): string | undefined {
    return this.config.get('TELEGRAM_WEBHOOK_SECRET', { infer: true });
  }
}
