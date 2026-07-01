import { z } from 'zod';

import type { SettingFieldDef, SettingsModuleSchema } from '../ports/settings-schema-registry.port.js';

export function zodForSettingField(def: SettingFieldDef): z.ZodType {
  switch (def.type) {
    case 'enum':
      return z.enum(def.values as [string, ...string[]]);
    case 'boolean':
      return z.boolean();
    case 'number': {
      let schema = z.number().int();
      if (def.min !== undefined) schema = schema.min(def.min);
      if (def.max !== undefined) schema = schema.max(def.max);
      return schema;
    }
    case 'bigint-string': {
      const minStr = def.min;
      const maxStr = def.max;
      return z
        .string()
        .regex(/^\d+$/, 'Must be a non-negative integer string')
        .superRefine((v, ctx) => {
          if (!/^\d+$/.test(v)) return; // guard: skip range check if not numeric
          const val = BigInt(v);
          if (minStr !== undefined && val < BigInt(minStr)) {
            ctx.addIssue({ code: z.ZodIssueCode.too_small, minimum: Number(minStr), type: 'number', inclusive: true, message: `Must be >= ${minStr}` });
          }
          if (maxStr !== undefined && val > BigInt(maxStr)) {
            ctx.addIssue({ code: z.ZodIssueCode.too_big, maximum: Number(maxStr), type: 'number', inclusive: true, message: `Must be <= ${maxStr}` });
          }
        });
    }
    case 'enum-array':
      return z.array(z.enum([...def.values] as [string, ...string[]]));
    case 'string-array': {
      let schema = z.array(z.string());
      if (def.maxItems !== undefined) {
        schema = schema.max(def.maxItems);
      }
      return schema;
    }
    default: {
      const _exhaustive: never = def;
      throw new Error(`Unsupported setting type: ${(_exhaustive as SettingFieldDef).type}`);
    }
  }
}

export function zodForSettingKey(
  schema: SettingsModuleSchema,
  key: string,
): z.ZodType | undefined {
  const def = schema[key];
  if (!def) {
    return undefined;
  }

  return zodForSettingField(def);
}
