import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { IPaymentAttemptRepository } from '../../ports/payment-attempt.repository.port.js';
import type { IPaymentReceiptRepository } from '../../ports/payment-receipt.repository.port.js';
import type { IPdfExportPort } from '../../ports/pdf-export.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { ITenantRepository } from '../../ports/tenant.repository.port.js';
import type { ITenantSequenceRepository } from '../../ports/tenant-sequence.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  buildContractReference,
  loadPaymentReceiptContext,
} from './payment-receipt-context.loader.js';
import { resolveOrCreatePaymentReceiptNumber } from './resolve-payment-receipt-number.js';
import {
  buildPaymentMethodDetails,
  maskCustomerPhoneForReceipt,
  renderPaymentReceiptHtml,
  resolvePaymentMethodLabel,
} from './render-payment-receipt-html.js';

export type GeneratePaymentReceiptInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  paymentAttemptId: string;
  staffContext: DataScopeStaffContext;
};

export type GeneratePaymentReceiptResult = {
  buffer: Buffer;
  filename: string;
  receiptNumber: string;
};

export class GeneratePaymentReceiptUseCase
  implements UseCase<GeneratePaymentReceiptInput, GeneratePaymentReceiptResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly installments: IInstallmentRepository,
    private readonly sales: ISaleRepository,
    private readonly staff: IStaffRepository,
    private readonly tenants: ITenantRepository,
    private readonly branches: IBranchReader,
    private readonly paymentReceipts: IPaymentReceiptRepository,
    private readonly sequences: ITenantSequenceRepository,
    private readonly pdfExport: IPdfExportPort,
  ) {}

  async execute(input: GeneratePaymentReceiptInput): Promise<GeneratePaymentReceiptResult> {
    const context = await loadPaymentReceiptContext({
      tenantId: input.tenantId,
      branchId: input.branchId,
      staffId: input.staffId,
      paymentAttemptId: input.paymentAttemptId,
      staffContext: input.staffContext,
      paymentAttempts: this.paymentAttempts,
      installments: this.installments,
      sales: this.sales,
      staff: this.staff,
      tenants: this.tenants,
      branches: this.branches,
    });

    const tenantRecord = await this.tenants.findById(input.tenantId);
    if (!tenantRecord) {
      throw new ApplicationError('TENANT_NOT_FOUND', 'Tenant was not found.', 404);
    }

    const referenceDate = context.attempt.confirmedAt ?? new Date();

    const { receiptNumber } = await this.unitOfWork.transaction((tx) =>
      resolveOrCreatePaymentReceiptNumber({
        tenantId: input.tenantId,
        tenantSlug: tenantRecord.slug,
        paymentAttemptId: context.attempt.id,
        referenceDate,
        createdById: input.staffId,
        paymentReceipts: this.paymentReceipts,
        sequences: this.sequences,
        tx,
      }),
    );

    const method = typeof context.attempt.metadata?.method === 'string'
      ? context.attempt.metadata.method
      : undefined;

    const html = renderPaymentReceiptHtml({
      tenant: context.tenantBranding,
      receiptNumber,
      confirmedAt: referenceDate,
      customerName: context.customerName,
      customerPhoneMasked: maskCustomerPhoneForReceipt(context.customerPhone),
      contractReference: buildContractReference(context.sale),
      installmentSequence: context.installment.sequenceNumber,
      installmentAmountRial: context.installment.amountRial,
      paymentAmountRial: context.attempt.amountRial,
      paymentMethodLabel: resolvePaymentMethodLabel(method),
      paymentMethodDetails: buildPaymentMethodDetails(method, context.attempt.metadata),
      confirmedByStaffName: context.confirmedByStaffName,
      note: context.attempt.note,
    });

    let buffer: Buffer;
    try {
      buffer = await this.pdfExport.htmlToPdf(html, { orientation: 'portrait' });
    } catch {
      throw new ApplicationError(
        'PDF_GENERATION_FAILED',
        'PDF generation failed. Please try again.',
        500,
      );
    }

    return {
      buffer,
      filename: `payment-receipt-${receiptNumber}.pdf`,
      receiptNumber,
    };
  }
}
