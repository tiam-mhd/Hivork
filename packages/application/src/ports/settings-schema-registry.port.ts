export type EnumSettingDef = {
  type: 'enum';
  values: readonly string[];
  default: string;
};

export type BooleanSettingDef = {
  type: 'boolean';
  default: boolean;
};

export type NumberSettingDef = {
  type: 'number';
  min?: number;
  max?: number;
  default: number;
};

/** Monetary/large integer stored as bigint-safe string (e.g. "150" = 1.50%) */
export type BigintStringSettingDef = {
  type: 'bigint-string';
  min?: string;
  max?: string;
  default: string;
};

export type EnumArraySettingDef = {
  type: 'enum-array';
  values: readonly string[];
  default: readonly string[];
};

export type StringArraySettingDef = {
  type: 'string-array';
  maxItems?: number;
  default: readonly string[];
};

export type SettingFieldDef =
  | EnumSettingDef
  | BooleanSettingDef
  | NumberSettingDef
  | BigintStringSettingDef
  | EnumArraySettingDef
  | StringArraySettingDef;

export type SettingsModuleSchema = Readonly<Record<string, SettingFieldDef>>;

export interface ISettingsSchemaRegistry {
  getSchema(module: string): SettingsModuleSchema | undefined;
  hasModule(module: string): boolean;
}
