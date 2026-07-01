import type { TenantModulesReader } from '@hivork/module-core';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaTenantModulesReader implements TenantModulesReader {
  constructor(private readonly prisma: PrismaService) {}

  async findEnabledModules(tenantId: string): Promise<string[]> {
    const row = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { enabledModules: true },
    });

    return row?.enabledModules ?? [];
  }
}
