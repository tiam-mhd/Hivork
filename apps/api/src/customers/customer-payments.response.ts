import type { CustomerPaymentListRecord } from '@hivork/application';
import type { CustomerPaymentMethodDto } from '@hivork/contracts/customers';

export function toCustomerPaymentResponse(item: CustomerPaymentListRecord) {
  return {
    paymentId: item.paymentId,
    amountRial: item.amountRial.toString(),
    status: item.status,
    method: item.method as CustomerPaymentMethodDto,
    confirmedAt: item.confirmedAt?.toISOString() ?? null,
    installmentNumber: item.installmentNumber,
    saleTitle: item.saleTitle,
    saleId: item.saleId,
  };
}
