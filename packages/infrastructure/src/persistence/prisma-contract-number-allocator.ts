import type { IContractNumberAllocator, OutboxTransaction } from '@hivork/application';
import { ApplicationError } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

/** IFP-061 stub — replaced by IFP-074 settings-backed atomic sequence. */
@Injectable()
export class PrismaContractNumberAllocator implements IContractNumberAllocator {
  constructor(private readonly prisma: PrismaService) {}

  async allocate(tenantId: string, tx?: OutboxTransaction): Promise<string> {
    const client = (tx ?? this.prisma) as PrismaService;
    const activeCount = await client.sale.count({
      where: { tenantId, deletedAt: null },
    });

    const year = new Date().getFullYear();
    const contractNumber = `CTR-${year}-${String(activeCount + 1).padStart(6, '0')}`;

    const collision = await client.sale.findFirst({
      where: { tenantId, contractNumber, deletedAt: null },
      select: { id: true },
    });

    if (collision) {
      throw new ApplicationError(
        'CONTRACT_NUMBER_GENERATION_FAILED',
        'Could not allocate a unique contract number.',
        500,
      );
    }

    return contractNumber;
  }
}
