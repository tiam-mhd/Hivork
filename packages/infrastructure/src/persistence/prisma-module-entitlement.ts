import { ApplicationError, type IModuleEntitlement } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaModuleEntitlement implements IModuleEntitlement {
  constructor(private readonly prisma: PrismaService) {}

  async assertModuleEnabled(tenantId: string, moduleCode: string): Promise<void> {
    const row = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { enabledModules: true },
    });

    const enabledModules = row?.enabledModules ?? [];

    if (!enabledModules.includes(moduleCode)) {
      throw new ApplicationError(
        'MODULE_NOT_ENABLED',
        `Module "${moduleCode}" is not enabled for this tenant.`,
        403,
      );
    }
  }
}
