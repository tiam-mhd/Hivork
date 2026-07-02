import type { CustomerCategoryLookupResult, ICustomerCategoryReader } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaCustomerCategoryReader implements ICustomerCategoryReader {
  constructor(private readonly prisma: PrismaService) {}

  async existsActiveInTenant(tenantId: string, categoryId: string): Promise<boolean> {
    const row = await this.prisma.customerCategory.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
      select: { id: true },
    });

    return row !== null;
  }

  async resolveBySlugOrName(
    tenantId: string,
    value: string,
  ): Promise<CustomerCategoryLookupResult> {
    const normalized = value.trim().toLowerCase();

    const matches = await this.prisma.customerCategory.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { slug: { equals: normalized, mode: 'insensitive' } },
          { name: { equals: value.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      take: 2,
    });

    if (matches.length === 0) {
      return { status: 'not_found' };
    }

    if (matches.length > 1) {
      return { status: 'ambiguous' };
    }

    return { status: 'found', categoryId: matches[0]!.id };
  }
}
