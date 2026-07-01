import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { ISettingsSchemaRegistry } from '../ports/settings-schema-registry.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import { resolveEffectiveSettings } from './resolve-effective-settings.js';

export type GetSettingsInput = {
  tenantId: string;
  module: string;
};

export type GetSettingsOutput = {
  module: string;
  settings: Record<string, unknown>;
};

export class GetSettingsUseCase implements UseCase<GetSettingsInput, GetSettingsOutput> {
  constructor(
    private readonly schemaRegistry: ISettingsSchemaRegistry,
    private readonly settingsRepository: ITenantSettingsRepository,
  ) {}

  async execute(input: GetSettingsInput): Promise<GetSettingsOutput> {
    const schema = this.schemaRegistry.getSchema(input.module);
    if (!schema) {
      throw new ApplicationError(
        'UNKNOWN_SETTINGS_MODULE',
        `Unknown settings module: ${input.module}`,
        400,
      );
    }

    const stored = await this.settingsRepository.findByModule(input.tenantId, input.module);

    return {
      module: input.module,
      settings: resolveEffectiveSettings(schema, stored),
    };
  }
}
