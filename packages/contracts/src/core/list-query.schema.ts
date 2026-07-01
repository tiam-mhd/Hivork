import { z } from 'zod';

import { DataTableQuerySchema } from '../ui/data-table.schema.js';
import { FilterAstSchema, type FilterAst } from '../ui/filter-ast.schema.js';

export const ListQuerySchema = DataTableQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  filter: FilterAstSchema.optional(),
});

export type ListQueryDto = z.infer<typeof ListQuerySchema>;

const FILTER_URL_MAX_BYTES = 2048;

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Parses `filter` query param (base64url JSON or raw JSON). */
export function parseFilterQueryParam(value: string | undefined): FilterAst | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const trimmed = value.trim();
  let json: unknown;

  try {
    if (trimmed.startsWith('{')) {
      json = JSON.parse(trimmed);
    } else {
      const decoded = decodeBase64Url(trimmed);
      if (new TextEncoder().encode(decoded).byteLength > FILTER_URL_MAX_BYTES) {
        return undefined;
      }
      json = JSON.parse(decoded);
    }
  } catch {
    return undefined;
  }

  const parsed = FilterAstSchema.safeParse(json);
  return parsed.success ? parsed.data : undefined;
}

export const ListQueryParamsSchema = ListQuerySchema.extend({
  filter: z.undefined(),
}).extend({
  filterParam: z.string().optional(),
});

export function parseListFilterFromQuery(query: {
  filter?: FilterAst;
  filterParam?: string;
}): FilterAst | undefined {
  if (query.filter) {
    return query.filter;
  }
  return parseFilterQueryParam(query.filterParam);
}
