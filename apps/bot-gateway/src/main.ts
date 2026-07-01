import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import 'reflect-metadata';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  const appConfig = app.get(AppConfigService);

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  await app.listen(appConfig.port);
}

void bootstrap();
