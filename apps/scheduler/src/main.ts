import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import 'reflect-metadata';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const appConfig = app.get(AppConfigService);

  app.useLogger(app.get(Logger));

  await app.listen(appConfig.port);
}

void bootstrap();
