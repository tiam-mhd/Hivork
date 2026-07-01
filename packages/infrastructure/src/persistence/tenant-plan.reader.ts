import { Injectable } from '@nestjs/common';
import { ITenantPlanReader } from '@hivork/application';

import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_MAX_ACTIVE_SALES_MULTIPLIER = 10;

function readMaxActiveSalesFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).maxActiveSales;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

@Injectable()
export class PrismaTenantPlanReader implements ITenantPlanReader {
  constructor(private readonly prisma: PrismaService) {}

  async getMaxCustomers(tenantId: string): Promise<number> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { plan: { select: { maxCustomers: true } } },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    return tenant.plan.maxCustomers;
  }

  async getMaxActiveSales(tenantId: string): Promise<number> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        plan: {
          select: {
            maxCustomers: true,
            metadata: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const fromMetadata = readMaxActiveSalesFromMetadata(tenant.plan.metadata);
    if (fromMetadata !== null) {
      return fromMetadata;
    }

    return tenant.plan.maxCustomers * DEFAULT_MAX_ACTIVE_SALES_MULTIPLIER;
  }

  async getMaxBranches(tenantId: string): Promise<number> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { plan: { select: { maxBranches: true } } },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    return tenant.plan.maxBranches;
  }

  async getMaxStaff(tenantId: string): Promise<number> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { plan: { select: { maxStaff: true } } },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    return tenant.plan.maxStaff;
  }
}
