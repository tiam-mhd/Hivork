import { ModuleRegistryService } from '@hivork/module-core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';

import { AppModule } from '../../../src/app.module.js';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter.js';
import { AppConfigService } from '../../../src/config/app-config.service.js';

export const DEFAULT_REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export async function probeRedis(url: string = DEFAULT_REDIS_URL): Promise<boolean> {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
  });

  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    try {
      await client.quit();
    } catch {
      // ignore
    }
    return false;
  }
}

export async function createIntegrationApp() {
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

  return { app, server };
}

export type HttpRequestInit = RequestInit & {
  token?: string;
  idempotencyKey?: string;
};

export function createHttpClient(baseUrl: string) {
  return async function request(path: string, init?: HttpRequestInit) {
    const headers = new Headers(init?.headers);
    if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (init?.token) {
      headers.set('Authorization', `Bearer ${init.token}`);
    }
    if (init?.idempotencyKey) {
      headers.set('Idempotency-Key', init.idempotencyKey);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : null;
    return { response, body };
  };
}

export async function startHttpServer(
  server: import('node:http').Server,
): Promise<{ baseUrl: string; port: number }> {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  return { baseUrl: `http://127.0.0.1:${port}/api`, port };
}

export async function stopHttpServer(
  app: Awaited<ReturnType<typeof createIntegrationApp>>['app'],
  server: import('node:http').Server,
): Promise<void> {
  if (app) {
    await app.close();
  }

  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

export function hasIntegrationRuntime(databaseUrl?: string | null): boolean {
  return Boolean(databaseUrl ?? process.env.DATABASE_URL) || process.env.CI === 'true';
}
