import { createHash } from 'node:crypto';

import type { CreateSaleInput } from './create-sale.use-case.js';

export function hashCreateSaleRequest(
  input: Pick<
    CreateSaleInput,
    | 'tenantCustomerId'
    | 'branchId'
    | 'title'
    | 'description'
    | 'invoiceNumber'
    | 'totalAmountRial'
    | 'downPaymentRial'
    | 'discountRial'
    | 'taxRial'
    | 'installmentCount'
    | 'firstDueDate'
    | 'contractDate'
    | 'intervalDays'
  >,
): string {
  const payload = {
    tenantCustomerId: input.tenantCustomerId,
    branchId: input.branchId,
    title: input.title ?? null,
    description: input.description ?? null,
    invoiceNumber: input.invoiceNumber ?? null,
    totalAmountRial: input.totalAmountRial.toString(),
    downPaymentRial: input.downPaymentRial.toString(),
    discountRial: input.discountRial?.toString() ?? null,
    taxRial: input.taxRial?.toString() ?? null,
    installmentCount: input.installmentCount,
    firstDueDate: input.firstDueDate.toISOString(),
    contractDate: input.contractDate.toISOString(),
    intervalDays: input.intervalDays,
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
