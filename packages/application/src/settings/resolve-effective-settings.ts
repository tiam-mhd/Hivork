import type { SettingsModuleSchema } from '../ports/settings-schema-registry.port.js';

export function resolveEffectiveSettings(
  schema: SettingsModuleSchema,
  stored: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(schema)) {
    result[key] = key in stored ? stored[key] : def.default;
  }

  return result;
}
