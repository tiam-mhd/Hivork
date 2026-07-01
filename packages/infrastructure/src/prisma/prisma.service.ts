import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { createHivorkPrismaClient, type HivorkPrismaClient } from './prisma.client.js';

const ExtendedPrismaClient = class {
  constructor() {
    return createHivorkPrismaClient();
  }
} as new () => HivorkPrismaClient;

@Injectable()
export class PrismaService extends ExtendedPrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
