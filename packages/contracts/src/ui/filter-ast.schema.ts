import { z } from 'zod';

export const FilterOperatorSchema = z.enum([
  'eq',
  'neq',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'in',
  'not_in',
  'is_null',
  'is_not_null',
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const FilterFieldTypeSchema = z.enum([
  'string',
  'number',
  'date',
  'enum',
  'boolean',
  'uuid',
  'money_rial',
]);

export type FilterFieldType = z.infer<typeof FilterFieldTypeSchema>;

export const FilterConditionSchema = z.object({
  type: z.literal('condition'),
  field: z.string().min(1),
  operator: FilterOperatorSchema,
  value: z.unknown().optional(),
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

export type FilterGroup = {
  type: 'group';
  logic: 'and' | 'or';
  children: Array<FilterCondition | FilterGroup>;
};

export const FilterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    type: z.literal('group'),
    logic: z.enum(['and', 'or']),
    children: z
      .array(z.union([FilterConditionSchema, FilterGroupSchema]))
      .min(1),
  }),
);

export const FilterAstSchema = z.object({
  root: FilterGroupSchema,
});

export type FilterAst = z.infer<typeof FilterAstSchema>;

export const FILTER_AST_MAX_DEPTH = 2;
export const FILTER_URL_MAX_BYTES = 2048;

export const FilterFieldDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: FilterFieldTypeSchema,
  operators: z.array(FilterOperatorSchema).optional(),
  enumOptions: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
  placeholder: z.string().optional(),
});

export type FilterFieldDef = z.infer<typeof FilterFieldDefSchema>;

const MONEY_RIAL_VALUE_REGEX = /^\d+$/;

export function isMoneyRialValue(value: unknown): boolean {
  return typeof value === 'string' && MONEY_RIAL_VALUE_REGEX.test(value);
}

export function operatorRequiresValue(operator: FilterOperator): boolean {
  return operator !== 'is_null' && operator !== 'is_not_null';
}

export function operatorRequiresRangeValue(operator: FilterOperator): boolean {
  return operator === 'between';
}
