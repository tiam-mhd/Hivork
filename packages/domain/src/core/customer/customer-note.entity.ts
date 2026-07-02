import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';

const MAX_BODY_LENGTH = 5000;

export class CustomerNote {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly tenantCustomerId: string,
    private _body: string,
    private _isPinned: boolean,
    readonly authorStaffId: string,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _deleteReason: string | null = null,
  ) {}

  static create(props: {
    tenantId: string;
    tenantCustomerId: string;
    body: string;
    authorStaffId: string;
    isPinned?: boolean;
  }): CustomerNote {
    return new CustomerNote(
      randomUUID(),
      props.tenantId,
      props.tenantCustomerId,
      normalizeBody(props.body),
      props.isPinned ?? false,
      props.authorStaffId,
    );
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    tenantCustomerId: string;
    body: string;
    isPinned: boolean;
    authorStaffId: string;
    deletedAt: Date | null;
    deletedById: string | null;
    deleteReason: string | null;
  }): CustomerNote {
    return new CustomerNote(
      props.id,
      props.tenantId,
      props.tenantCustomerId,
      props.body,
      props.isPinned,
      props.authorStaffId,
      props.deletedAt,
      props.deletedById,
      props.deleteReason,
    );
  }

  get body(): string {
    return this._body;
  }

  get isPinned(): boolean {
    return this._isPinned;
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  get deletedById(): string | null {
    return this._deletedById;
  }

  get deleteReason(): string | null {
    return this._deleteReason;
  }

  updateBody(body: string): void {
    this.assertActive();
    this._body = normalizeBody(body);
  }

  pin(): void {
    this.assertActive();
    this._isPinned = true;
  }

  unpin(): void {
    this.assertActive();
    this._isPinned = false;
  }

  softDelete(deletedById: string, reason?: string): void {
    if (this.isDeleted) {
      throw new DomainError('ALREADY_DELETED');
    }
    this._deletedAt = new Date();
    this._deletedById = deletedById;
    this._deleteReason = reason?.trim() || null;
    this._isPinned = false;
  }

  restore(): void {
    if (!this.isDeleted) {
      throw new DomainError('NOT_DELETED');
    }
    this._deletedAt = null;
    this._deletedById = null;
    this._deleteReason = null;
  }

  private assertActive(): void {
    if (this.isDeleted) {
      throw new DomainError('NOTE_DELETED');
    }
  }
}

function normalizeBody(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new DomainError('FIELD_REQUIRED');
  }
  if (trimmed.length > MAX_BODY_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}
