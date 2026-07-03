import {
  DEFAULT_PAYMENT_METHOD_CONFIGS,
  PAYMENT_METHODS_SETTING_KEY,
  PaymentMethodsSettingValueSchema,
  type PaymentMethodSettingsPatchItemDto,
} from '@hivork/contracts/settings';
import {
  mapUnifiedMethodToInternal,
  type PaymentMethodConfigDto,
  type UnifiedPaymentMethodDto,
} from '@hivork/contracts/payments';

export { PAYMENT_METHODS_SETTING_KEY, DEFAULT_PAYMENT_METHOD_CONFIGS };

export function parseStoredPaymentMethodConfigs(
  settings: Record<string, unknown>,
): PaymentMethodConfigDto[] {
  const raw = settings[PAYMENT_METHODS_SETTING_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return mergePaymentMethodConfigs([], undefined);
  }

  const parsed = PaymentMethodsSettingValueSchema.safeParse(raw);
  if (!parsed.success) {
    return mergePaymentMethodConfigs([], undefined);
  }

  return mergePaymentMethodConfigs(parsed.data.methods, undefined);
}

export function mergePaymentMethodConfigs(
  stored: PaymentMethodConfigDto[],
  patch: PaymentMethodSettingsPatchItemDto[] | undefined,
): PaymentMethodConfigDto[] {
  const byMethod = new Map<UnifiedPaymentMethodDto, PaymentMethodConfigDto>(
    DEFAULT_PAYMENT_METHOD_CONFIGS.map((config) => [config.method, { ...config }]),
  );

  for (const config of stored) {
    const base = byMethod.get(config.method);
    if (!base) {
      continue;
    }

    byMethod.set(config.method, {
      ...base,
      enabled: config.enabled,
      displayOrder: config.displayOrder,
      labelFa: config.labelFa ?? base.labelFa,
      requiresPlan: base.requiresPlan,
    });
  }

  if (patch) {
    for (const item of patch) {
      const base = byMethod.get(item.method);
      if (!base) {
        continue;
      }

      byMethod.set(item.method, {
        ...base,
        enabled: item.enabled,
        displayOrder: item.displayOrder,
        labelFa: item.labelFa ?? base.labelFa,
        requiresPlan: base.requiresPlan,
      });
    }
  }

  return [...byMethod.values()].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function collectDisabledMethodsWithPendingPayments(input: {
  previous: PaymentMethodConfigDto[];
  next: PaymentMethodConfigDto[];
  pendingCountsByInternalMethod: Map<string, number>;
}): string[] {
  const warnings: string[] = [];

  for (const nextMethod of input.next) {
    const previous = input.previous.find((item) => item.method === nextMethod.method);
    if (!previous?.enabled || nextMethod.enabled) {
      continue;
    }

    const internalMethod = mapUnifiedMethodToInternal(nextMethod.method);
    const pendingCount = input.pendingCountsByInternalMethod.get(internalMethod) ?? 0;
    if (pendingCount > 0) {
      warnings.push(
        `Method "${nextMethod.method}" was disabled but ${pendingCount} pending payment attempt(s) still use it.`,
      );
    }
  }

  return warnings;
}

export function toPaymentMethodsSettingValue(
  methods: PaymentMethodConfigDto[],
): { methods: PaymentMethodConfigDto[] } {
  return { methods };
}
