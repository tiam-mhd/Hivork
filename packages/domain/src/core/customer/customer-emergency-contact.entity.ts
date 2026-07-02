import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';
import { normalizePhone } from '../shared/phone.js';

export type EmergencyContactRelation = 'parent' | 'spouse' | 'sibling' | 'other';

const MAX_NAME_LENGTH = 120;

export class CustomerEmergencyContact {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly tenantCustomerId: string,
    private _name: string,
    private _phone: string,
    private _relation: EmergencyContactRelation,
    private _isPrimary: boolean,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _deleteReason: string | null = null,
  ) {}

  static create(props: {
    tenantId: string;
    tenantCustomerId: string;
    name: string;
    phone: string;
    relation?: EmergencyContactRelation;
    isPrimary?: boolean;
  }): CustomerEmergencyContact {
    return new CustomerEmergencyContact(
      randomUUID(),
      props.tenantId,
      props.tenantCustomerId,
      normalizeName(props.name),
      normalizePhone(props.phone),
      props.relation ?? 'other',
      props.isPrimary ?? false,
    );
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    tenantCustomerId: string;
    name: string;
    phone: string;
    relation: EmergencyContactRelation;
    isPrimary: boolean;
    deletedAt: Date | null;
    deletedById: string | null;
    deleteReason: string | null;
  }): CustomerEmergencyContact {
    return new CustomerEmergencyContact(
      props.id,
      props.tenantId,
      props.tenantCustomerId,
      props.name,
      props.phone,
      props.relation,
      props.isPrimary,
      props.deletedAt,
      props.deletedById,
      props.deleteReason,
    );
  }

  static assertSinglePrimary(contacts: readonly CustomerEmergencyContact[]): void {
    const primaryCount = contacts.filter((contact) => contact.isPrimary && !contact.isDeleted).length;
    if (primaryCount > 1) {
      throw new DomainError('MULTIPLE_PRIMARY_EMERGENCY_CONTACTS');
    }
  }

  get name(): string {
    return this._name;
  }

  get phone(): string {
    return this._phone;
  }

  get relation(): EmergencyContactRelation {
    return this._relation;
  }

  get isPrimary(): boolean {
    return this._isPrimary;
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

  update(props: {
    name?: string;
    phone?: string;
    relation?: EmergencyContactRelation;
  }): void {
    this.assertActive();
    if (props.name !== undefined) {
      this._name = normalizeName(props.name);
    }
    if (props.phone !== undefined) {
      this._phone = normalizePhone(props.phone);
    }
    if (props.relation !== undefined) {
      this._relation = props.relation;
    }
  }

  markPrimary(): void {
    this.assertActive();
    this._isPrimary = true;
  }

  demotePrimary(): void {
    this.assertActive();
    this._isPrimary = false;
  }

  softDelete(deletedById: string, reason?: string): void {
    if (this.isDeleted) {
      throw new DomainError('ALREADY_DELETED');
    }
    this._deletedAt = new Date();
    this._deletedById = deletedById;
    this._deleteReason = reason?.trim() || null;
    this._isPrimary = false;
  }

  private assertActive(): void {
    if (this.isDeleted) {
      throw new DomainError('EMERGENCY_CONTACT_DELETED');
    }
  }
}

function normalizeName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new DomainError('FIELD_REQUIRED');
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}
