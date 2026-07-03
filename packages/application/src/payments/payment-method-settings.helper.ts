import {
  type PaymentMethodConfigDto,
  type PaymentMethodDisabledReasonDto,
  type PaymentMethodListItemDto,
  type PaymentMethodPlanTierDto,
  type UnifiedPaymentMethodDto,
} from '@hivork/contracts/payments';
import {
  DEFAULT_PAYMENT_METHOD_CONFIGS,
  PAYMENT_METHODS_SETTING_KEY,
} from '@hivork/contracts/settings';

import { ApplicationError } from '../errors/application.error.js';
import type { ITenantPlanReader } from '../ports/tenant-plan.reader.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import { parseStoredPaymentMethodConfigs } from '../settings/payment-methods/merge-payment-method-settings.js';

export { PAYMENT_METHODS_SETTING_KEY, DEFAULT_PAYMENT_METHOD_CONFIGS };

const PLAN_TIER_RANK: Record<string, number> = {
  basic: 0,
  starter: 0,
  pro: 1,
  enterprise: 2,
};

export function normalizePlanCode(planCode: string): string {
  return planCode === 'starter' ? 'basic' : planCode;
}

export function planMeetsRequirement(
  planCode: string,
  required?: PaymentMethodPlanTierDto,
): boolean {
  if (!required) {
    return true;
  }

  const normalized = normalizePlanCode(planCode);
  const actualRank = PLAN_TIER_RANK[normalized] ?? 0;
  const requiredRank = PLAN_TIER_RANK[required] ?? 0;
  return actualRank >= requiredRank;
}

export function parsePaymentMethodConfigs(
  settings: Record<string, unknown>,
): PaymentMethodConfigDto[] {
  return parseStoredPaymentMethodConfigs(settings);
}

export function resolvePaymentMethodListItems(
  configs: PaymentMethodConfigDto[],
  planCode: string,
): PaymentMethodListItemDto[] {
  return [...configs]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((config) => {
      if (!config.enabled) {
        return {
          ...config,
          enabled: false,
          disabledReason: 'tenant_disabled' satisfies PaymentMethodDisabledReasonDto,
        };
      }

      if (!planMeetsRequirement(planCode, config.requiresPlan)) {
        return {
          ...config,
          enabled: false,
          disabledReason: 'plan_required' satisfies PaymentMethodDisabledReasonDto,
        };
      }

      return { ...config, enabled: true };
    });
}

export async function loadPaymentMethodListItems(
  tenantSettings: ITenantSettingsRepository,
  tenantPlans: ITenantPlanReader,
  tenantId: string,
): Promise<PaymentMethodListItemDto[]> {
  const [settings, planCode] = await Promise.all([
    tenantSettings.findByModule(tenantId, 'installments'),
    tenantPlans.getPlanCode(tenantId),
  ]);

  const configs = parsePaymentMethodConfigs(settings);
  return resolvePaymentMethodListItems(configs, planCode);
}

export function assertPaymentMethodAvailable(
  methods: PaymentMethodListItemDto[],
  method: UnifiedPaymentMethodDto,
): void {
  const entry = methods.find((item) => item.method === method);

  if (!entry) {
    throw new ApplicationError(
      'PAYMENT_METHOD_DISABLED',
      'This payment method is not available for this tenant.',
      403,
    );
  }

  if (entry.enabled) {
    return;
  }

  if (entry.disabledReason === 'plan_required') {
    throw new ApplicationError(
      'PLAN_ENTITLEMENT_REQUIRED',
      'Your plan does not include this payment method.',
      403,
      { method, requiresPlan: entry.requiresPlan ?? null },
    );
  }

  throw new ApplicationError(
    'PAYMENT_METHOD_DISABLED',
    'This payment method is disabled for this tenant.',
    403,
    { method },
  );
}
