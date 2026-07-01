import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { ISettingsSchemaRegistry } from '../ports/settings-schema-registry.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import { zodForSettingField } from './build-setting-zod.js';

export type UpdateSettingInput = {
  tenantId: string;
  module: string;
  key: string;
  value: unknown;
  staffId: string;
  ip?: string;
  userAgent?: string;
};

export type UpdateSettingOutput = {
  module: string;
  key: string;
  value: unknown;
};

export class UpdateSettingUseCase implements UseCase<UpdateSettingInput, UpdateSettingOutput> {
  constructor(
    private readonly schemaRegistry: ISettingsSchemaRegistry,
    private readonly settingsRepository: ITenantSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateSettingInput): Promise<UpdateSettingOutput> {
    const schema = this.schemaRegistry.getSchema(input.module);
    if (!schema) {
      throw new ApplicationError(
        'UNKNOWN_SETTINGS_MODULE',
        `Unknown settings module: ${input.module}`,
        400,
      );
    }

    const fieldDef = schema[input.key];
    if (!fieldDef) {
      throw new ApplicationError(
        'INVALID_SETTING_KEY',
        `Unknown setting key: ${input.key}`,
        400,
        { module: input.module, key: input.key },
      );
    }

    const valueSchema = zodForSettingField(fieldDef);
    const parsed = valueSchema.safeParse(input.value);
    if (!parsed.success) {
      throw new ApplicationError(
        'INVALID_SETTING_VALUE',
        parsed.error.issues[0]?.message ?? 'Invalid setting value',
        400,
        { module: input.module, key: input.key },
      );
    }

    const stored = await this.settingsRepository.findByModule(input.tenantId, input.module);
    const oldValue = input.key in stored ? stored[input.key] : fieldDef.default;

    await this.settingsRepository.upsert({
      tenantId: input.tenantId,
      module: input.module,
      key: input.key,
      value: parsed.data,
      updatedById: input.staffId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'settings.change',
      entityType: 'setting',
      entityId: `${input.module}.${input.key}`,
      oldValue,
      newValue: parsed.data,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      module: input.module,
      key: input.key,
      value: parsed.data,
    };
  }
}
