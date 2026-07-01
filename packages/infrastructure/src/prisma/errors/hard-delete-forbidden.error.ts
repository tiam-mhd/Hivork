export class HardDeleteForbiddenError extends Error {
  readonly code = 'HARD_DELETE_FORBIDDEN';

  constructor(model: string) {
    super(`Hard delete is forbidden on ${model}. Use soft delete instead.`);
    this.name = 'HardDeleteForbiddenError';
  }
}
