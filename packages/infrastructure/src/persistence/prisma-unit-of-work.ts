import type { IUnitOfWork, OutboxTransaction } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async transaction<T>(work: (tx: OutboxTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => work(tx));
  }
}
