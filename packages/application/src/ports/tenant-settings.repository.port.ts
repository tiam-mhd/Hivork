import type { OutboxTransaction } from './outbox.port.js';

export type TenantSettingRecord = {
  id: string;
  tenantId: string;
  module: string;
  key: string;
  value: unknown;
};

export type UpsertTenantSettingInput = {
  tenantId: string;
  module: string;
  key: string;
  value: unknown;
  updatedById: string;
};

export interface ITenantSettingsRepository {
  findByModule(
    tenantId: string,
    module: string,
    tx?: OutboxTransaction,
  ): Promise<Record<string, unknown>>;
  upsert(input: UpsertTenantSettingInput, tx?: OutboxTransaction): Promise<TenantSettingRecord>;
}
