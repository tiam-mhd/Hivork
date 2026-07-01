import { ModuleRegistryService } from '@hivork/module-core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

import { HttpExceptionFilter } from '@api/common/filters/http-exception.filter.js';
import { AppConfigService } from '@api/config/app-config.service.js';

export async function createIntegrationTestApp() {
  const { AppModule } = await import('@api/app.module.js');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  const appConfig = app.get(AppConfigService);

  app.use(cookieParser());
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
  app.get(ModuleRegistryService).bootstrap(app);

  await app.init();
  const server = app.getHttpServer() as import('node:http').Server;

  return { app, server, appConfig };
}
