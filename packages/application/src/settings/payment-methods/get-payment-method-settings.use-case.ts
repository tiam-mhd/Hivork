import type { PaymentMethodConfigDto } from '@hivork/contracts/payments';

import { UseCase } from '../../core/use-case.js';
import type { IModuleEntitlement } from '../../ports/module-entitlement.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import { parseStoredPaymentMethodConfigs } from './merge-payment-method-settings.js';

export type GetPaymentMethodSettingsInput = {
  tenantId: string;
};

export type GetPaymentMethodSettingsOutput = {
  methods: PaymentMethodConfigDto[];
  warnings?: string[];
};

const INSTALLMENTS_MODULE = 'installments';

export class GetPaymentMethodSettingsUseCase
  implements UseCase<GetPaymentMethodSettingsInput, GetPaymentMethodSettingsOutput>
{
  constructor(
    private readonly moduleEntitlement: IModuleEntitlement,
    private readonly settingsRepository: ITenantSettingsRepository,
  ) {}

  async execute(input: GetPaymentMethodSettingsInput): Promise<GetPaymentMethodSettingsOutput> {
    await this.moduleEntitlement.assertModuleEnabled(input.tenantId, INSTALLMENTS_MODULE);

    const stored = await this.settingsRepository.findByModule(input.tenantId, INSTALLMENTS_MODULE);
    return {
      methods: parseStoredPaymentMethodConfigs(stored),
    };
  }
}
