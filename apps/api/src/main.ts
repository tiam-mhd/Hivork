import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ModuleRegistryService } from '@hivork/module-core';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import 'reflect-metadata';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const appConfig = app.get(AppConfigService);

  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', appConfig.trustedProxyHops);
  app.enableCors({ origin: appConfig.corsOrigin, credentials: true });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.get(ModuleRegistryService).bootstrap(app);

  await app.listen(appConfig.port);
}

void bootstrap();
