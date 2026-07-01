import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';
import { normalizePhone, validatePhone } from '../shared/phone.js';

export type UserStatus = 'active' | 'suspended';

export class User {
  constructor(
    readonly id: string,
    private _phone: string,
    private _name: string | null,
    private _status: UserStatus,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {
    validatePhone(_phone);
  }

  static create(phone: string, name?: string): User {
    const normalized = normalizePhone(phone);
    validatePhone(normalized);

    return new User(
      randomUUID(),
      normalized,
      name?.trim() ?? null,
      'active',
    );
  }

  static reconstitute(props: {
    id: string;
    phone: string;
    name: string | null;
    status: UserStatus;
    deletedAt: Date | null;
    deletedById: string | null;
  }): User {
    return new User(
      props.id,
      props.phone,
      props.name,
      props.status,
      props.deletedAt,
      props.deletedById,
    );
  }

  get phone(): string {
    return this._phone;
  }

  get name(): string | null {
    return this._name;
  }

  get status(): UserStatus {
    return this._status;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get deletedById(): string | null {
    return this._deletedById;
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  get canAuthenticate(): boolean {
    return this._status === 'active' && !this.isDeleted;
  }

  updateName(name: string): void {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new DomainError('INVALID_NAME');
    }
    this._name = trimmed;
  }

  suspend(): void {
    if (this._status === 'suspended') {
      throw new DomainError('ALREADY_SUSPENDED');
    }
    this._status = 'suspended';
  }

  pseudonymizePhone(): void {
    this._phone = `deleted_${this.id}`;
    this._name = null;
  }

  changePhone(newPhone: string): void {
    if (this.isDeleted) {
      throw new DomainError('USER_DELETED');
    }
    const normalized = normalizePhone(newPhone);
    validatePhone(normalized);
    if (normalized === this._phone) {
      throw new DomainError('PHONE_UNCHANGED');
    }
    this._phone = normalized;
  }
}
