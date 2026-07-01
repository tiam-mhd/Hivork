import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EnvConfig } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get port(): number {
    return this.config.get('SCHEDULER_PORT', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('REDIS_URL', { infer: true });
  }

  get logLevel(): EnvConfig['LOG_LEVEL'] {
    return this.config.get('LOG_LEVEL', { infer: true });
  }
}
