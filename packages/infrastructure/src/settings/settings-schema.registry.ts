import type { ISettingsSchemaRegistry, SettingsModuleSchema } from '@hivork/application';
import {
  coreSettingsSchema,
  installmentsSettingsSchema,
  remindersSettingsSchema,
} from '@hivork/module-core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SettingsSchemaRegistry implements ISettingsSchemaRegistry {
  private readonly schemas = new Map<string, SettingsModuleSchema>([
    ['core', coreSettingsSchema as SettingsModuleSchema],
    ['reminders', remindersSettingsSchema as SettingsModuleSchema],
    ['installments', installmentsSettingsSchema as SettingsModuleSchema],
  ]);

  getSchema(module: string): SettingsModuleSchema | undefined {
    return this.schemas.get(module);
  }

  hasModule(module: string): boolean {
    return this.schemas.has(module);
  }
}
