import {
  FILTER_AST_MAX_DEPTH,
  FILTER_URL_MAX_BYTES,
  FilterAstSchema,
  type FilterAst,
  type FilterCondition,
  type FilterFieldDef,
  type FilterGroup,
  type FilterOperator,
  isMoneyRialValue,
  operatorRequiresRangeValue,
  operatorRequiresValue,
} from '@hivork/contracts/ui';

export function createEmptyFilterAst(defaultFieldId?: string): FilterAst {
  return {
    root: {
      type: 'group',
      logic: 'and',
      children: [createEmptyCondition(defaultFieldId)],
    },
  };
}

export function createEmptyCondition(fieldId = ''): FilterCondition {
  return {
    type: 'condition',
    field: fieldId,
    operator: 'eq',
    value: undefined,
  };
}

export function createEmptyGroup(logic: 'and' | 'or' = 'and'): FilterGroup {
  return {
    type: 'group',
    logic,
    children: [createEmptyCondition()],
  };
}

export function getFilterGroupDepth(group: FilterGroup, depth = 1): number {
  let maxDepth = depth;
  for (const child of group.children) {
    if (child.type === 'group') {
      maxDepth = Math.max(maxDepth, getFilterGroupDepth(child, depth + 1));
    }
  }
  return maxDepth;
}

export function canNestFilterGroup(ast: FilterAst): boolean {
  return getFilterGroupDepth(ast.root) < FILTER_AST_MAX_DEPTH;
}

export function findFieldDef(
  fields: FilterFieldDef[],
  fieldId: string,
): FilterFieldDef | undefined {
  return fields.find((field) => field.id === fieldId);
}

export function sanitizeFilterAstForFields(
  ast: FilterAst,
  fields: FilterFieldDef[],
): { ast: FilterAst; skippedFieldIds: string[] } {
  const knownIds = new Set(fields.map((field) => field.id));
  const skippedFieldIds: string[] = [];

  const sanitizeGroup = (group: FilterGroup): FilterGroup | null => {
    const children = group.children
      .map((child) => {
        if (child.type === 'group') {
          return sanitizeGroup(child);
        }

        if (!knownIds.has(child.field)) {
          skippedFieldIds.push(child.field);
          return null;
        }

        return child;
      })
      .filter((child): child is FilterCondition | FilterGroup => child !== null);

    if (children.length === 0) {
      return null;
    }

    return { ...group, children };
  };

  const sanitizedRoot = sanitizeGroup(ast.root);
  if (!sanitizedRoot) {
    return { ast: createEmptyFilterAst(fields[0]?.id), skippedFieldIds };
  }

  return { ast: { root: sanitizedRoot }, skippedFieldIds };
}

function isConditionComplete(
  condition: FilterCondition,
  field: FilterFieldDef | undefined,
): boolean {
  if (!condition.field || !field) {
    return false;
  }

  if (!operatorRequiresValue(condition.operator)) {
    return true;
  }

  if (operatorRequiresRangeValue(condition.operator)) {
    const range = condition.value as { from?: unknown; to?: unknown } | undefined;
    return Boolean(range?.from) && Boolean(range?.to);
  }

  if (condition.operator === 'in' || condition.operator === 'not_in') {
    return Array.isArray(condition.value) && condition.value.length > 0;
  }

  if (field.type === 'money_rial') {
    return isMoneyRialValue(condition.value);
  }

  if (field.type === 'boolean') {
    return typeof condition.value === 'boolean';
  }

  return condition.value !== undefined && condition.value !== null && String(condition.value).trim() !== '';
}

function countCompleteConditionsInGroup(
  group: FilterGroup,
  fields: FilterFieldDef[],
): number {
  return group.children.reduce((count, child) => {
    if (child.type === 'group') {
      return count + countCompleteConditionsInGroup(child, fields);
    }

    const field = findFieldDef(fields, child.field);
    return count + (isConditionComplete(child, field) ? 1 : 0);
  }, 0);
}

export function countActiveFilterConditions(
  ast: FilterAst | null | undefined,
  fields: FilterFieldDef[],
): number {
  if (!ast) {
    return 0;
  }
  return countCompleteConditionsInGroup(ast.root, fields);
}

export type FilterValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateFilterAstForApply(
  ast: FilterAst,
  fields: FilterFieldDef[],
): FilterValidationResult {
  const activeCount = countActiveFilterConditions(ast, fields);
  if (activeCount === 0) {
    return { valid: false, message: 'حداقل یک شرط معتبر اضافه کنید.' };
  }

  if (getFilterGroupDepth(ast.root) > FILTER_AST_MAX_DEPTH) {
    return { valid: false, message: 'حداکثر یک سطح گروه تو در تو مجاز است.' };
  }

  const parsed = FilterAstSchema.safeParse(ast);
  if (!parsed.success) {
    return { valid: false, message: 'ساختار فیلتر نامعتبر است.' };
  }

  return { valid: true };
}

export function encodeFilterAstToUrl(ast: FilterAst): string | null {
  const json = JSON.stringify(ast);
  const bytes = new TextEncoder().encode(json);
  if (bytes.byteLength > FILTER_URL_MAX_BYTES) {
    return null;
  }

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export function decodeFilterAstFromUrl(encoded: string): FilterAst | null {
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = FilterAstSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function isFilterAstEmpty(
  ast: FilterAst | null | undefined,
  fields: FilterFieldDef[],
): boolean {
  return countActiveFilterConditions(ast, fields) === 0;
}

export function getInitialOperatorForField(
  field: FilterFieldDef | undefined,
): FilterOperator {
  if (!field) {
    return 'eq';
  }

  if (field.type === 'string') {
    return 'contains';
  }

  return 'eq';
}
