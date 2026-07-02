import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';
import { normalizePhone } from '../shared/phone.js';

export type CustomerContactPhoneLabel = 'mobile' | 'home' | 'work' | 'other';

const PHONE_LABELS = new Set<CustomerContactPhoneLabel>(['mobile', 'home', 'work', 'other']);
const MAX_NOTES_LENGTH = 500;

/** Default tenant limit — override via tenant settings in IFP-036. */
export const DEFAULT_MAX_SECONDARY_PHONES = 5;

export class CustomerContactPhone {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly tenantCustomerId: string,
    private _phone: string,
    private _label: CustomerContactPhoneLabel,
    private _isWhatsApp: boolean,
    private _isPrimarySecondary: boolean,
    private _isVerified: boolean,
    private _notes: string | null,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _deleteReason: string | null = null,
  ) {}

  static create(props: {
    tenantId: string;
    tenantCustomerId: string;
    phone: string;
    label?: CustomerContactPhoneLabel;
    isWhatsApp?: boolean;
    isPrimarySecondary?: boolean;
    isVerified?: boolean;
    notes?: string | null;
    primaryUserPhone?: string | null;
  }): CustomerContactPhone {
    const normalized = normalizePhone(props.phone);
    if (props.primaryUserPhone) {
      CustomerContactPhone.assertNotPrimaryPhone(normalized, props.primaryUserPhone);
    }
    return new CustomerContactPhone(
      randomUUID(),
      props.tenantId,
      props.tenantCustomerId,
      normalized,
      normalizeLabel(props.label ?? 'mobile'),
      props.isWhatsApp ?? false,
      props.isPrimarySecondary ?? false,
      props.isVerified ?? false,
      normalizeOptionalNotes(props.notes),
    );
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    tenantCustomerId: string;
    phone: string;
    label: CustomerContactPhoneLabel;
    isWhatsApp: boolean;
    isPrimarySecondary: boolean;
    isVerified: boolean;
    notes: string | null;
    deletedAt: Date | null;
    deletedById: string | null;
    deleteReason: string | null;
  }): CustomerContactPhone {
    return new CustomerContactPhone(
      props.id,
      props.tenantId,
      props.tenantCustomerId,
      props.phone,
      props.label,
      props.isWhatsApp,
      props.isPrimarySecondary,
      props.isVerified,
      props.notes,
      props.deletedAt,
      props.deletedById,
      props.deleteReason,
    );
  }

  static assertNotPrimaryPhone(phone: string, primaryUserPhone: string): void {
    const normalizedPrimary = normalizePhone(primaryUserPhone);
    const normalizedSecondary = normalizePhone(phone);
    if (normalizedSecondary === normalizedPrimary) {
      throw new DomainError('SECONDARY_EQUALS_PRIMARY');
    }
  }

  static assertNoDuplicatesWithinCustomer(phones: readonly string[]): void {
    const seen = new Set<string>();
    for (const raw of phones) {
      const phone = normalizePhone(raw);
      if (seen.has(phone)) {
        throw new DomainError('DUPLICATE_SECONDARY_PHONE');
      }
      seen.add(phone);
    }
  }

  static assertMaxCount(count: number, max = DEFAULT_MAX_SECONDARY_PHONES): void {
    if (count > max) {
      throw new DomainError('LIMIT_EXCEEDED');
    }
  }

  static assertSinglePrimarySecondary(phones: readonly CustomerContactPhone[]): void {
    const primaryCount = phones.filter(
      (phone) => phone.isPrimarySecondary && !phone.isDeleted,
    ).length;
    if (primaryCount > 1) {
      throw new DomainError('MULTIPLE_PRIMARY_SECONDARY_PHONES');
    }
  }

  static assertNoTenantDuplicate(
    phone: string,
    existing: readonly { phone: string; tenantCustomerId: string; isDeleted: boolean }[],
    tenantCustomerId: string,
  ): void {
    const normalized = normalizePhone(phone);
    const conflict = existing.find(
      (entry) =>
        !entry.isDeleted &&
        entry.phone === normalized &&
        entry.tenantCustomerId !== tenantCustomerId,
    );
    if (conflict) {
      throw new DomainError('CUSTOMER_PHONE_EXISTS');
    }
  }

  get phone(): string {
    return this._phone;
  }

  get label(): CustomerContactPhoneLabel {
    return this._label;
  }

  get isWhatsApp(): boolean {
    return this._isWhatsApp;
  }

  get isPrimarySecondary(): boolean {
    return this._isPrimarySecondary;
  }

  get isVerified(): boolean {
    return this._isVerified;
  }

  get notes(): string | null {
    return this._notes;
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
    phone?: string;
    label?: CustomerContactPhoneLabel;
    isWhatsApp?: boolean;
    isPrimarySecondary?: boolean;
    notes?: string | null;
    primaryUserPhone?: string | null;
  }): void {
    this.assertActive();
    if (props.phone !== undefined) {
      const normalized = normalizePhone(props.phone);
      if (props.primaryUserPhone) {
        CustomerContactPhone.assertNotPrimaryPhone(normalized, props.primaryUserPhone);
      }
      this._phone = normalized;
    }
    if (props.label !== undefined) {
      this._label = normalizeLabel(props.label);
    }
    if (props.isWhatsApp !== undefined) {
      this._isWhatsApp = props.isWhatsApp;
    }
    if (props.isPrimarySecondary !== undefined) {
      this._isPrimarySecondary = props.isPrimarySecondary;
    }
    if (props.notes !== undefined) {
      this._notes = normalizeOptionalNotes(props.notes);
    }
  }

  markVerified(): void {
    this.assertActive();
    this._isVerified = true;
  }

  markPrimarySecondary(): void {
    this.assertActive();
    this._isPrimarySecondary = true;
  }

  demotePrimarySecondary(): void {
    this.assertActive();
    this._isPrimarySecondary = false;
  }

  softDelete(deletedById: string, reason?: string): void {
    if (this.isDeleted) {
      throw new DomainError('ALREADY_DELETED');
    }
    this._deletedAt = new Date();
    this._deletedById = deletedById;
    this._deleteReason = reason?.trim() || null;
    this._isPrimarySecondary = false;
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
      throw new DomainError('CONTACT_PHONE_DELETED');
    }
  }
}

function normalizeLabel(value: CustomerContactPhoneLabel): CustomerContactPhoneLabel {
  if (!PHONE_LABELS.has(value)) {
    throw new DomainError('INVALID_PHONE_LABEL');
  }
  return value;
}

function normalizeOptionalNotes(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MAX_NOTES_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}
