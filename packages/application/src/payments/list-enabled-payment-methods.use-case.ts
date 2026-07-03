import type { PaymentMethodListItemDto } from '@hivork/contracts/payments';

import { UseCase } from '../core/use-case.js';
import type { ITenantPlanReader } from '../ports/tenant-plan.reader.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import { loadPaymentMethodListItems } from './payment-method-settings.helper.js';

export type ListEnabledPaymentMethodsInput = {
  tenantId: string;
};

export type ListEnabledPaymentMethodsOutput = {
  methods: PaymentMethodListItemDto[];
};

export class ListEnabledPaymentMethodsUseCase
  implements UseCase<ListEnabledPaymentMethodsInput, ListEnabledPaymentMethodsOutput>
{
  constructor(
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly tenantPlans: ITenantPlanReader,
  ) {}

  async execute(
    input: ListEnabledPaymentMethodsInput,
  ): Promise<ListEnabledPaymentMethodsOutput> {
    const methods = await loadPaymentMethodListItems(
      this.tenantSettings,
      this.tenantPlans,
      input.tenantId,
    );

    return { methods };
  }
}
