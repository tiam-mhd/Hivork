export class InstallmentCannotDeleteError extends Error {
  readonly code = 'INSTALLMENT_CANNOT_DELETE';

  constructor(model: string) {
    super(`Delete is forbidden on ${model}. Installments are append-only — use status transitions only.`);
    this.name = 'InstallmentCannotDeleteError';
  }
}
