import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AppConfigModule } from './config/app-config.module';
import { EnvConfig, validateEnv } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { createBullRootModule, JobsQueueModule } from './jobs/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '../../.env')],
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          autoLogging: true,
        },
      }),
    }),
    createBullRootModule(),
    AppConfigModule,
    JobsQueueModule,
    HealthModule,
  ],
})
export class AppModule {}
