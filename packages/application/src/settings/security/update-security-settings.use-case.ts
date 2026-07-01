import {
  type SecuritySettingsDto,
  UpdateSecuritySettingsSchema,
  type UpdateSecuritySettingsDto,
} from '@hivork/contracts';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import {
  GetSecuritySettingsUseCase,
  assertValidIpv4CidrEntries,
  type GetSecuritySettingsOutput,
} from './get-security-settings.use-case.js';
import { CORE_MODULE, SECURITY_SETTING_KEYS } from './merge-security-settings.js';

export type UpdateSecuritySettingsInput = {
  tenantId: string;
  actorId: string;
  patch: unknown;
  ip?: string;
  userAgent?: string;
};

function parseSecuritySettingsPatch(patch: unknown): UpdateSecuritySettingsDto {
  const result = UpdateSecuritySettingsSchema.safeParse(patch);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApplicationError(
      'VALIDATION_ERROR',
      issue?.message ?? 'Invalid security settings patch.',
      400,
      { path: issue?.path },
    );
  }

  if (result.data.ipAllowlist.cidrs) {
    assertValidIpv4CidrEntries(result.data.ipAllowlist.cidrs);
  }

  return result.data;
}

export class UpdateSecuritySettingsUseCase
  implements UseCase<UpdateSecuritySettingsInput, GetSecuritySettingsOutput>
{
  constructor(
    private readonly getSettings: GetSecuritySettingsUseCase,
    private readonly settingsRepository: ITenantSettingsRepository,
    private readonly audit: AuditService,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: UpdateSecuritySettingsInput): Promise<GetSecuritySettingsOutput> {
    const parsed = parseSecuritySettingsPatch(input.patch);
    const { ipAllowlist } = parsed;

    const current = await this.getSettings.execute({ tenantId: input.tenantId });
    const nextSecurity: SecuritySettingsDto = {
      ipAllowlist: {
        enabled: ipAllowlist.enabled ?? current.security.ipAllowlist.enabled,
        cidrs: ipAllowlist.cidrs ?? current.security.ipAllowlist.cidrs,
      },
    };

    const updates: Array<{ key: string; value: unknown }> = [];
    if (ipAllowlist.enabled !== undefined) {
      updates.push({
        key: SECURITY_SETTING_KEYS.ipAllowlistEnabled,
        value: ipAllowlist.enabled,
      });
    }
    if (ipAllowlist.cidrs !== undefined) {
      updates.push({
        key: SECURITY_SETTING_KEYS.ipAllowlistCidrs,
        value: ipAllowlist.cidrs,
      });
    }

    if (updates.length === 0) {
      return current;
    }

    await this.unitOfWork.transaction(async (tx) => {
      for (const update of updates) {
        await this.settingsRepository.upsert(
          {
            tenantId: input.tenantId,
            module: CORE_MODULE,
            key: update.key,
            value: update.value,
            updatedById: input.actorId,
          },
          tx,
        );
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.actorId,
          action: 'settings.security.changed',
          entityType: 'TenantSettings',
          entityId: `${CORE_MODULE}.security`,
          oldValue: current.security,
          newValue: nextSecurity,
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );
    });

    return this.getSettings.execute({ tenantId: input.tenantId });
  }
}
