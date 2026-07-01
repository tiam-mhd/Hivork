import {
  type InstallmentsSettingsDto,
  UpdateInstallmentsSettingsSchema,
  type UpdateInstallmentsSettingsDto,
} from '@hivork/contracts';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import {
  GetInstallmentSettingsUseCase,
  type GetInstallmentSettingsOutput,
} from './get-installment-settings.use-case.js';

export type UpdateInstallmentSettingsInput = {
  tenantId: string;
  actorId: string;
  patch: UpdateInstallmentsSettingsDto;
  ip?: string;
  userAgent?: string;
};

const INSTALLMENTS_MODULE = 'installments';

function parseUpdatePatch(patch: UpdateInstallmentsSettingsDto): UpdateInstallmentsSettingsDto {
  const result = UpdateInstallmentsSettingsSchema.safeParse(patch);
  if (!result.success) {
    const issue = result.error.issues[0];
    const code =
      issue?.code === 'unrecognized_keys' ? 'SETTING_KEY_UNKNOWN' : 'SETTING_VALUE_INVALID';

    throw new ApplicationError(
      code,
      issue?.message ?? 'Invalid installments settings patch.',
      400,
      { path: issue?.path },
    );
  }

  return result.data;
}

export class UpdateInstallmentSettingsUseCase
  implements UseCase<UpdateInstallmentSettingsInput, GetInstallmentSettingsOutput>
{
  constructor(
    private readonly getSettings: GetInstallmentSettingsUseCase,
    private readonly settingsRepository: ITenantSettingsRepository,
    private readonly audit: AuditService,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: UpdateInstallmentSettingsInput): Promise<GetInstallmentSettingsOutput> {
    const parsed = parseUpdatePatch(input.patch);
    const keys = Object.keys(parsed) as (keyof InstallmentsSettingsDto)[];

    if (keys.length === 0) {
      return this.getSettings.execute({ tenantId: input.tenantId });
    }

    const current = await this.getSettings.execute({ tenantId: input.tenantId });

    await this.unitOfWork.transaction(async (tx) => {
      for (const key of keys) {
        const oldValue = current.installments[key];
        const newValue = parsed[key]!;

        const saved = await this.settingsRepository.upsert(
          {
            tenantId: input.tenantId,
            module: INSTALLMENTS_MODULE,
            key,
            value: newValue,
            updatedById: input.actorId,
          },
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.actorId,
            action: 'settings.change',
            entityType: 'TenantSettings',
            entityId: saved.id,
            oldValue: { [key]: oldValue },
            newValue: { [key]: newValue },
            metadata: { module: INSTALLMENTS_MODULE, key },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );
      }
    });

    return this.getSettings.execute({ tenantId: input.tenantId });
  }
}
