import type { InstallmentsSettingsReadDto } from '@hivork/contracts';

import { UseCase } from '../../core/use-case.js';
import type { IModuleEntitlement } from '../../ports/module-entitlement.port.js';
import type { ITenantSequenceRepository } from '../../ports/tenant-sequence.repository.port.js';
import { CONTRACT_NUMBER_SEQUENCE_KEY } from '../../ports/tenant-sequence.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import { mergeInstallmentsSettings } from './merge-installments-settings.js';

export type GetInstallmentSettingsInput = {
  tenantId: string;
};

export type GetInstallmentSettingsOutput = {
  installments: InstallmentsSettingsReadDto;
};

export class GetInstallmentSettingsUseCase
  implements UseCase<GetInstallmentSettingsInput, GetInstallmentSettingsOutput>
{
  constructor(
    private readonly moduleEntitlement: IModuleEntitlement,
    private readonly settingsRepository: ITenantSettingsRepository,
    private readonly sequences: ITenantSequenceRepository,
  ) {}

  async execute(input: GetInstallmentSettingsInput): Promise<GetInstallmentSettingsOutput> {
    await this.moduleEntitlement.assertModuleEnabled(input.tenantId, 'installments');

    const stored = await this.settingsRepository.findByModule(input.tenantId, 'installments');
    const merged = mergeInstallmentsSettings(stored);
    const contract_number_next_sequence = await this.sequences.peekNextValue(
      input.tenantId,
      CONTRACT_NUMBER_SEQUENCE_KEY,
    );

    return {
      installments: {
        ...merged,
        contract_number_next_sequence,
      },
    };
  }
}
