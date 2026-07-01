export type SearchFieldMode = 'contains' | 'prefix' | 'exact';

export type SearchFieldConfig = {
  field: string;
  mode: SearchFieldMode;
  prismaPath: string[];
  normalize?: (value: string) => string;
};

/** Escapes `%` and `_` for safe ILIKE/LIKE patterns. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function normalizeSearchTerm(
  raw: string | undefined,
  options?: { phoneNormalize?: (value: string) => string },
): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > 200) {
    return trimmed.slice(0, 200);
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 4 && options?.phoneNormalize) {
    try {
      return options.phoneNormalize(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function buildSearchCondition(
  config: SearchFieldConfig,
  term: string,
): Record<string, unknown> {
  const value = config.normalize ? config.normalize(term) : term;
  const escaped = escapeLikePattern(value);

  const leaf =
    config.mode === 'exact'
      ? { equals: value, mode: 'insensitive' as const }
      : config.mode === 'prefix'
        ? { startsWith: escaped, mode: 'insensitive' as const }
        : { contains: escaped, mode: 'insensitive' as const };

  return config.prismaPath.reduceRight<Record<string, unknown>>(
    (child, segment) => ({ [segment]: child }),
    leaf,
  );
}

export function searchToWhere(
  search: string | undefined,
  fields: SearchFieldConfig[],
): Record<string, unknown> | undefined {
  const term = search?.trim();
  if (!term || fields.length === 0) {
    return undefined;
  }

  const orConditions = fields.map((field) => buildSearchCondition(field, term));
  return { OR: orConditions };
}
