import type { FilterAst, FilterCondition, FilterGroup, FilterOperator } from '@hivork/contracts/ui';
import { isMoneyRialValue, operatorRequiresValue } from '@hivork/contracts/ui';

function isFilterGroup(node: FilterCondition | FilterGroup): node is FilterGroup {
  return node.type === 'group';
}

function mapOperator(
  operator: FilterOperator,
  value: unknown,
): Record<string, unknown> | undefined {
  if (!operatorRequiresValue(operator)) {
    return operator === 'is_null' ? { equals: null } : { not: null };
  }

  switch (operator) {
    case 'eq':
      return { equals: value };
    case 'neq':
      return { not: value };
    case 'contains':
      return { contains: String(value), mode: 'insensitive' };
    case 'not_contains':
      return { not: { contains: String(value), mode: 'insensitive' } };
    case 'starts_with':
      return { startsWith: String(value), mode: 'insensitive' };
    case 'ends_with':
      return { endsWith: String(value), mode: 'insensitive' };
    case 'gt':
      return { gt: value };
    case 'gte':
      return { gte: value };
    case 'lt':
      return { lt: value };
    case 'lte':
      return { lte: value };
    case 'between': {
      const range = value as { from?: unknown; to?: unknown };
      if (range.from === undefined || range.to === undefined) {
        return undefined;
      }
      return { gte: range.from, lte: range.to };
    }
    case 'in':
      return { in: Array.isArray(value) ? value : [value] };
    case 'not_in':
      return { notIn: Array.isArray(value) ? value : [value] };
    default:
      return undefined;
  }
}

function conditionToWhere(
  condition: FilterCondition,
  fieldMap: FilterFieldMap,
): Record<string, unknown> | undefined {
  const mapping = fieldMap[condition.field];
  if (!mapping) {
    return undefined;
  }

  let mappedValue: unknown = condition.value;
  if (mapping.type === 'money_rial' && typeof condition.value === 'string') {
    if (!isMoneyRialValue(condition.value)) {
      return undefined;
    }
    mappedValue = BigInt(condition.value);
  }

  const operatorWhere = mapOperator(condition.operator, mappedValue);
  if (!operatorWhere) {
    return undefined;
  }

  const segments = mapping.prismaPath.split('.');
  return segments.reduceRight<Record<string, unknown>>(
    (child, segment) => ({ [segment]: child }),
    operatorWhere,
  );
}

function groupToWhere(
  group: FilterGroup,
  fieldMap: FilterFieldMap,
): Record<string, unknown> | undefined {
  const children = group.children
    .map((child) =>
      isFilterGroup(child) ? groupToWhere(child, fieldMap) : conditionToWhere(child, fieldMap),
    )
    .filter((item): item is Record<string, unknown> => item !== undefined);

  if (children.length === 0) {
    return undefined;
  }

  if (children.length === 1) {
    return children[0];
  }

  return group.logic === 'or' ? { OR: children } : { AND: children };
}

export type FilterFieldMapEntry = {
  prismaPath: string;
  branchScoped?: boolean;
  type?: 'money_rial' | 'string' | 'number' | 'date' | 'enum' | 'boolean' | 'uuid';
};

export type FilterFieldMap = Record<string, FilterFieldMapEntry>;

export type TenantFilterContext = {
  tenantId: string;
  dataScope: 'all' | 'branch' | 'own';
  branchIds?: string[];
  staffId?: string;
};

export function filterAstToWhereClause(
  ast: FilterAst,
  fieldMap: FilterFieldMap,
): Record<string, unknown> | undefined {
  return groupToWhere(ast.root, fieldMap);
}

export function filterAstToWhere(
  ast: FilterAst | undefined,
  fieldMap: FilterFieldMap,
  ctx: TenantFilterContext,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    tenantId: ctx.tenantId,
    deletedAt: null,
  };

  if (!ast) {
    return base;
  }

  const filterWhere = filterAstToWhereClause(ast, fieldMap);
  if (!filterWhere) {
    return base;
  }

  return {
    AND: [base, filterWhere],
  };
}
