import { ITenantRepository, TenantRecord } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaTenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TenantRecord | null> {
    const row = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
    };
  }

  async findDetailById(id: string) {
    const row = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      legalName: row.legalName,
      taxId: row.taxId,
      logoUrl: row.logoUrl,
      address: row.address,
      phone: row.phone,
      email: row.email,
      status: row.status,
      timezone: row.timezone,
      locale: row.locale,
      enabledModules: [...row.enabledModules],
      trialEndsAt: row.trialEndsAt,
      onboardingCompletedAt: row.onboardingCompletedAt,
    };
  }

  async findBySlug(slug: string): Promise<TenantRecord | null> {
    const row = await this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
    };
  }
}
