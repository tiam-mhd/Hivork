import { DynamicModule, Module, type InjectionToken } from '@nestjs/common';

import { RedisService } from './redis.service.js';

export type RedisModuleOptions = {
  url: string;
};

@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions): DynamicModule {
    return this.createDynamicModule(options);
  }

  static forRootAsync(options: {
    inject?: InjectionToken[];
    useFactory: (...args: any[]) => RedisModuleOptions | Promise<RedisModuleOptions>;
  }): DynamicModule {
    return {
      global: true,
      module: RedisModule,
      providers: [
        {
          provide: RedisService,
          inject: options.inject ?? [],
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return new RedisService(config.url);
          },
        },
      ],
      exports: [RedisService],
    };
  }

  private static createDynamicModule(options: RedisModuleOptions): DynamicModule {
    return {
      global: true,
      module: RedisModule,
      providers: [
        {
          provide: RedisService,
          useFactory: () => new RedisService(options.url),
        },
      ],
      exports: [RedisService],
    };
  }
}
