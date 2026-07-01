import type { FilterFieldDef, FilterFieldType, FilterOperator } from '@hivork/contracts/ui';

export const DEFAULT_OPERATORS_BY_FIELD_TYPE: Record<FilterFieldType, FilterOperator[]> = {
  string: ['contains', 'eq', 'starts_with', 'is_null', 'is_not_null'],
  number: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  money_rial: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  date: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  enum: ['in', 'eq', 'neq'],
  boolean: ['eq'],
  uuid: ['eq', 'in'],
};

export const FILTER_OPERATOR_LABELS_FA: Record<FilterOperator, string> = {
  eq: 'برابر',
  neq: 'نابرابر',
  contains: 'شامل',
  not_contains: 'شامل نباشد',
  starts_with: 'شروع با',
  ends_with: 'پایان با',
  gt: 'بزرگ‌تر از',
  gte: 'بزرگ‌تر یا مساوی',
  lt: 'کوچک‌تر از',
  lte: 'کوچک‌تر یا مساوی',
  between: 'بین',
  in: 'یکی از',
  not_in: 'هیچ‌کدام از',
  is_null: 'خالی است',
  is_not_null: 'خالی نیست',
};

export function getOperatorsForField(field: FilterFieldDef): FilterOperator[] {
  return field.operators ?? DEFAULT_OPERATORS_BY_FIELD_TYPE[field.type];
}

export function isOperatorAllowedForField(
  field: FilterFieldDef,
  operator: FilterOperator,
): boolean {
  return getOperatorsForField(field).includes(operator);
}

export function getDefaultOperatorForField(field: FilterFieldDef): FilterOperator {
  return getOperatorsForField(field)[0] ?? 'eq';
}
