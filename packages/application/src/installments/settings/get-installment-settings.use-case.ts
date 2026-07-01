import type { InstallmentsSettingsDto } from '@hivork/contracts';

import { UseCase } from '../../core/use-case.js';
import type { IModuleEntitlement } from '../../ports/module-entitlement.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import { mergeInstallmentsSettings } from './merge-installments-settings.js';

export type GetInstallmentSettingsInput = {
  tenantId: string;
};

export type GetInstallmentSettingsOutput = {
  installments: InstallmentsSettingsDto;
};

export class GetInstallmentSettingsUseCase
  implements UseCase<GetInstallmentSettingsInput, GetInstallmentSettingsOutput>
{
  constructor(
    private readonly moduleEntitlement: IModuleEntitlement,
    private readonly settingsRepository: ITenantSettingsRepository,
  ) {}

  async execute(input: GetInstallmentSettingsInput): Promise<GetInstallmentSettingsOutput> {
    await this.moduleEntitlement.assertModuleEnabled(input.tenantId, 'installments');

    const stored = await this.settingsRepository.findByModule(input.tenantId, 'installments');

    return {
      installments: mergeInstallmentsSettings(stored),
    };
  }
}
