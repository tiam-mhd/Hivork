import {
  PAYMENT_METHODS_SETTING_KEY,
  UpdatePaymentMethodSettingsSchema,
  type UpdatePaymentMethodSettingsDto,
} from '@hivork/contracts/settings';
import { mapUnifiedMethodToInternal, type PaymentMethodConfigDto } from '@hivork/contracts/payments';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import {
  planMeetsRequirement,
} from '../../payments/payment-method-settings.helper.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IPaymentAttemptRepository } from '../../ports/payment-attempt.repository.port.js';
import type { ITenantPlanReader } from '../../ports/tenant-plan.reader.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import {
  GetPaymentMethodSettingsUseCase,
  type GetPaymentMethodSettingsOutput,
} from './get-payment-method-settings.use-case.js';
import {
  collectDisabledMethodsWithPendingPayments,
  mergePaymentMethodConfigs,
  parseStoredPaymentMethodConfigs,
  toPaymentMethodsSettingValue,
} from './merge-payment-method-settings.js';

export type UpdatePaymentMethodSettingsInput = {
  tenantId: string;
  actorId: string;
  patch: unknown;
  ip?: string;
  userAgent?: string;
};

const INSTALLMENTS_MODULE = 'installments';

function parsePatch(patch: unknown): UpdatePaymentMethodSettingsDto {
  const result = UpdatePaymentMethodSettingsSchema.safeParse(patch);
  if (!result.success) {
    const issue = result.error.issues[0];
    const code =
      issue?.message === 'DUPLICATE_METHOD' || issue?.message === 'DUPLICATE_DISPLAY_ORDER'
        ? issue.message
        : 'VALIDATION_ERROR';

    throw new ApplicationError(code, issue?.message ?? 'Invalid payment method settings.', 400, {
      path: issue?.path,
    });
  }

  return result.data;
}

function assertAtLeastOneEnabled(methods: PaymentMethodConfigDto[]): void {
  if (methods.some((method) => method.enabled)) {
    return;
  }

  throw new ApplicationError(
    'AT_LEAST_ONE_METHOD_REQUIRED',
    'At least one payment method must remain enabled.',
    400,
  );
}

function assertUniqueDisplayOrders(methods: PaymentMethodConfigDto[]): void {
  const orders = new Set<number>();
  for (const method of methods) {
    if (orders.has(method.displayOrder)) {
      throw new ApplicationError(
        'DUPLICATE_DISPLAY_ORDER',
        'displayOrder values must be unique.',
        400,
      );
    }
    orders.add(method.displayOrder);
  }
}

function assertPlanEntitlements(
  methods: PaymentMethodConfigDto[],
  planCode: string,
  patch: UpdatePaymentMethodSettingsDto,
): void {
  for (const item of patch.methods) {
    if (!item.enabled) {
      continue;
    }

    const config = methods.find((method) => method.method === item.method);
    if (!config?.requiresPlan) {
      continue;
    }

    if (!planMeetsRequirement(planCode, config.requiresPlan)) {
      throw new ApplicationError(
        'PLAN_ENTITLEMENT_REQUIRED',
        'Your plan does not include this payment method.',
        403,
        { method: item.method, requiresPlan: config.requiresPlan },
      );
    }
  }
}

export class UpdatePaymentMethodSettingsUseCase
  implements UseCase<UpdatePaymentMethodSettingsInput, GetPaymentMethodSettingsOutput>
{
  constructor(
    private readonly getSettings: GetPaymentMethodSettingsUseCase,
    private readonly settingsRepository: ITenantSettingsRepository,
    private readonly tenantPlans: ITenantPlanReader,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly audit: AuditService,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: UpdatePaymentMethodSettingsInput): Promise<GetPaymentMethodSettingsOutput> {
    const parsed = parsePatch(input.patch);
    const currentStored = await this.settingsRepository.findByModule(
      input.tenantId,
      INSTALLMENTS_MODULE,
    );
    const previous = parseStoredPaymentMethodConfigs(currentStored);
    const next = mergePaymentMethodConfigs(previous, parsed.methods);

    assertAtLeastOneEnabled(next);
    assertUniqueDisplayOrders(next);

    const planCode = await this.tenantPlans.getPlanCode(input.tenantId);
    assertPlanEntitlements(next, planCode, parsed);

    const disabledInternalMethods = parsed.methods
      .filter((item) => {
        const before = previous.find((method) => method.method === item.method);
        return before?.enabled && !item.enabled;
      })
      .map((item) => mapUnifiedMethodToInternal(item.method));

    const pendingCounts = await this.paymentAttempts.countPendingByMetadataMethods(
      input.tenantId,
      disabledInternalMethods,
    );

    const warnings = collectDisabledMethodsWithPendingPayments({
      previous,
      next,
      pendingCountsByInternalMethod: pendingCounts,
    });

    const oldValue = toPaymentMethodsSettingValue(previous);
    const newValue = toPaymentMethodsSettingValue(next);

    await this.unitOfWork.transaction(async (tx) => {
      const saved = await this.settingsRepository.upsert(
        {
          tenantId: input.tenantId,
          module: INSTALLMENTS_MODULE,
          key: PAYMENT_METHODS_SETTING_KEY,
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
          oldValue,
          newValue,
          metadata: { module: INSTALLMENTS_MODULE, key: PAYMENT_METHODS_SETTING_KEY },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );
    });

    const refreshed = await this.getSettings.execute({ tenantId: input.tenantId });
    return warnings.length > 0 ? { ...refreshed, warnings } : refreshed;
  }
}
