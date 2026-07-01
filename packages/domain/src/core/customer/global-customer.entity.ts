import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';

export type GlobalCustomerStatus = 'active' | 'suspended';

const PSEUDONYMIZED_NAME = 'حذف‌شده';

export class GlobalCustomer {
  constructor(
    readonly id: string,
    readonly userId: string,
    private _name: string | null,
    private _status: GlobalCustomerStatus,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _pseudonymizedAt: Date | null = null,
  ) {}

  static create(userId: string, name?: string): GlobalCustomer {
    return new GlobalCustomer(
      randomUUID(),
      userId,
      name?.trim() ?? null,
      'active',
    );
  }

  static reconstitute(props: {
    id: string;
    userId: string;
    name: string | null;
    status: GlobalCustomerStatus;
    deletedAt: Date | null;
    deletedById: string | null;
    pseudonymizedAt: Date | null;
  }): GlobalCustomer {
    return new GlobalCustomer(
      props.id,
      props.userId,
      props.name,
      props.status,
      props.deletedAt,
      props.deletedById,
      props.pseudonymizedAt,
    );
  }

  get name(): string | null {
    return this._name;
  }

  get status(): GlobalCustomerStatus {
    return this._status;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get deletedById(): string | null {
    return this._deletedById;
  }

  get pseudonymizedAt(): Date | null {
    return this._pseudonymizedAt;
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  get isPseudonymized(): boolean {
    return this._pseudonymizedAt !== null;
  }

  updateName(name: string): void {
    if (this.isPseudonymized) {
      throw new DomainError('CUSTOMER_PSEUDONYMIZED');
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new DomainError('INVALID_NAME');
    }
    this._name = trimmed;
  }

  softDelete(deletedById: string, _reason?: string): void {
    if (this._deletedAt !== null) {
      throw new DomainError('ALREADY_DELETED');
    }
    this._deletedAt = new Date();
    this._deletedById = deletedById;
  }

  restore(): void {
    if (this._pseudonymizedAt !== null) {
      throw new DomainError('CANNOT_RESTORE_PSEUDONYMIZED');
    }
    if (this._deletedAt === null) {
      throw new DomainError('NOT_DELETED');
    }
    this._deletedAt = null;
    this._deletedById = null;
  }

  pseudonymize(): void {
    if (this._pseudonymizedAt !== null) {
      throw new DomainError('ALREADY_PSEUDONYMIZED');
    }

    if (this._deletedAt === null) {
      this._deletedAt = new Date();
    }

    this._name = PSEUDONYMIZED_NAME;
    this._pseudonymizedAt = new Date();
  }
}
