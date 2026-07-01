/**
 * Application use case contract.
 *
 * Use cases orchestrate domain rules and call outbound **ports** (repository/service interfaces).
 * Concrete adapters live in `@hivork/infrastructure` and are wired via NestJS DI in `apps/*` —
 * never import infrastructure from this package.
 *
 * @example
 * ```typescript
 * class ConfirmPaymentUseCase implements UseCase<ConfirmPaymentInput, void> {
 *   constructor(
 *     private readonly installments: IInstallmentRepository,
 *     private readonly outbox: IOutboxPublisher,
 *   ) {}
 *
 *   async execute(input: ConfirmPaymentInput): Promise<void> {
 *     const installment = await this.installments.findById(input.installmentId);
 *     if (!installment) throw new DomainError('INSTALLMENT_NOT_FOUND');
 *     installment.confirmPayment(input.confirmedBy, input.at);
 *     await this.installments.save(installment);
 *   }
 * }
 * ```
 */
export interface UseCase<I, O> {
  execute(input: I): Promise<O>;
}
