export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
