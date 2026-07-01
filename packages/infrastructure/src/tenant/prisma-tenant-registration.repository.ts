import {
  type ITenantRegistrationRepository,
  type RegisterTenantData,
  type RegisterTenantResult,
  ApplicationError,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CORE_SETTING_DEFAULTS,
  DEFAULT_BRANCH_NAME,
  STARTER_PLAN_CODE,
  TRIAL_DAYS,
} from './tenant-registration.constants.js';

@Injectable()
export class PrismaTenantRegistrationRepository implements ITenantRegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isSlugTaken(slug: string): Promise<boolean> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.tenant.findFirst({ where: { slug } });
      return row !== null;
    });
  }

  async register(data: RegisterTenantData): Promise<RegisterTenantResult> {
    const plan = await this.prisma.plan.findFirst({
      where: { code: STARTER_PLAN_CODE, deletedAt: null },
    });
    if (!plan) {
      throw new ApplicationError('PLAN_NOT_FOUND', 'Starter plan is not configured.', 500);
    }

    const templates = await this.prisma.role.findMany({
      where: { isTemplate: true, tenantId: null, deletedAt: null },
      include: { rolePermissions: true },
    });
    if (templates.length === 0) {
      throw new ApplicationError(
        'ROLE_TEMPLATES_MISSING',
        'Role templates are not seeded.',
        500,
      );
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          legalName: data.legalName,
          taxId: data.taxId,
          phone: data.phone,
          email: data.email,
          planId: plan.id,
          enabledModules: ['installments'],
          status: 'trial',
          trialEndsAt,
          onboardingCompletedAt: null,
          timezone: 'Asia/Tehran',
          locale: 'fa_IR',
        },
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: DEFAULT_BRANCH_NAME,
          isDefault: true,
          isActive: true,
        },
      });

      const staff = await tx.staff.create({
        data: {
          tenantId: tenant.id,
          userId: data.ownerUserId,
          name: data.ownerName,
          status: 'active',
          dataScope: 'all',
          assignedBranchIds: [],
          primaryBranchId: branch.id,
        },
      });

      const roleIds = new Map<string, string>();
      for (const template of templates) {
        const role = await tx.role.create({
          data: {
            scope: 'tenant',
            tenantId: tenant.id,
            code: template.code,
            name: template.name,
            isSystem: true,
            isTemplate: false,
            dataScope: template.dataScope,
          },
        });

        if (template.rolePermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: template.rolePermissions.map((rp) => ({
              roleId: role.id,
              permissionId: rp.permissionId,
            })),
            skipDuplicates: true,
          });
        }

        roleIds.set(template.code, role.id);
      }

      const ownerRoleId = roleIds.get('owner');
      if (!ownerRoleId) {
        throw new ApplicationError('OWNER_ROLE_MISSING', 'Owner role template is missing.', 500);
      }

      await tx.staffRole.create({
        data: {
          staffId: staff.id,
          roleId: ownerRoleId,
        },
      });

      for (const setting of CORE_SETTING_DEFAULTS) {
        await tx.tenantSetting.create({
          data: {
            tenantId: tenant.id,
            module: setting.module,
            key: setting.key,
            value: setting.value as Prisma.InputJsonValue,
            createdById: staff.id,
            updatedById: staff.id,
          },
        });
      }

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: 'active',
          startsAt: new Date(),
        },
      });

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        staff: {
          id: staff.id,
          tenantId: tenant.id,
          name: staff.name,
          userId: staff.userId,
        },
      };
    });
  }
}
