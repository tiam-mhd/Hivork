import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';
import {
  coordinatesArePaired,
  isWithinIranBounds,
} from './iran-geo-bounds.js';

export type CustomerAddressLabel = 'home' | 'work' | 'billing' | 'other';

const MAX_LINE_LENGTH = 200;
const MAX_CITY_LENGTH = 80;
const MAX_POSTAL_CODE_LENGTH = 10;

export class CustomerAddress {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly tenantCustomerId: string,
    private _label: CustomerAddressLabel,
    private _line1: string,
    private _line2: string | null,
    private _city: string | null,
    private _province: string | null,
    private _postalCode: string | null,
    private _isPrimary: boolean,
    private _latitude: number | null,
    private _longitude: number | null,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _deleteReason: string | null = null,
  ) {}

  static create(props: {
    tenantId: string;
    tenantCustomerId: string;
    label?: CustomerAddressLabel;
    line1: string;
    line2?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    isPrimary?: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }): CustomerAddress {
    const address = new CustomerAddress(
      randomUUID(),
      props.tenantId,
      props.tenantCustomerId,
      props.label ?? 'home',
      normalizeRequiredText(props.line1, MAX_LINE_LENGTH),
      normalizeOptionalText(props.line2, MAX_LINE_LENGTH),
      normalizeOptionalText(props.city, MAX_CITY_LENGTH),
      normalizeOptionalText(props.province, MAX_CITY_LENGTH),
      normalizeOptionalText(props.postalCode, MAX_POSTAL_CODE_LENGTH),
      props.isPrimary ?? false,
      normalizeCoordinate(props.latitude),
      normalizeCoordinate(props.longitude),
    );
    address.assertCoordinates();
    return address;
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    tenantCustomerId: string;
    label: CustomerAddressLabel;
    line1: string;
    line2: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    isPrimary: boolean;
    latitude: number | null;
    longitude: number | null;
    deletedAt: Date | null;
    deletedById: string | null;
    deleteReason: string | null;
  }): CustomerAddress {
    return new CustomerAddress(
      props.id,
      props.tenantId,
      props.tenantCustomerId,
      props.label,
      props.line1,
      props.line2,
      props.city,
      props.province,
      props.postalCode,
      props.isPrimary,
      props.latitude,
      props.longitude,
      props.deletedAt,
      props.deletedById,
      props.deleteReason,
    );
  }

  static assertSinglePrimary(addresses: readonly CustomerAddress[]): void {
    const primaryCount = addresses.filter((address) => address.isPrimary && !address.isDeleted).length;
    if (primaryCount > 1) {
      throw new DomainError('MULTIPLE_PRIMARY_ADDRESSES');
    }
  }

  get label(): CustomerAddressLabel {
    return this._label;
  }

  get line1(): string {
    return this._line1;
  }

  get line2(): string | null {
    return this._line2;
  }

  get city(): string | null {
    return this._city;
  }

  get province(): string | null {
    return this._province;
  }

  get postalCode(): string | null {
    return this._postalCode;
  }

  get isPrimary(): boolean {
    return this._isPrimary;
  }

  get latitude(): number | null {
    return this._latitude;
  }

  get longitude(): number | null {
    return this._longitude;
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
    label?: CustomerAddressLabel;
    line1?: string;
    line2?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }): void {
    this.assertActive();
    if (props.label !== undefined) {
      this._label = props.label;
    }
    if (props.line1 !== undefined) {
      this._line1 = normalizeRequiredText(props.line1, MAX_LINE_LENGTH);
    }
    if (props.line2 !== undefined) {
      this._line2 = normalizeOptionalText(props.line2, MAX_LINE_LENGTH);
    }
    if (props.city !== undefined) {
      this._city = normalizeOptionalText(props.city, MAX_CITY_LENGTH);
    }
    if (props.province !== undefined) {
      this._province = normalizeOptionalText(props.province, MAX_CITY_LENGTH);
    }
    if (props.postalCode !== undefined) {
      this._postalCode = normalizeOptionalText(props.postalCode, MAX_POSTAL_CODE_LENGTH);
    }
    if (props.latitude !== undefined) {
      this._latitude = normalizeCoordinate(props.latitude);
    }
    if (props.longitude !== undefined) {
      this._longitude = normalizeCoordinate(props.longitude);
    }
    this.assertCoordinates();
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
      throw new DomainError('ADDRESS_DELETED');
    }
  }

  private assertCoordinates(): void {
    if (!coordinatesArePaired(this._latitude, this._longitude)) {
      throw new DomainError('COORDINATES_UNPAIRED');
    }
    if (
      this._latitude !== null &&
      this._longitude !== null &&
      !isWithinIranBounds(this._latitude, this._longitude)
    ) {
      throw new DomainError('COORDINATE_OUT_OF_IRAN');
    }
  }
}

function normalizeRequiredText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new DomainError('FIELD_REQUIRED');
  }
  if (trimmed.length > maxLength) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined, maxLength: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > maxLength) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}

function normalizeCoordinate(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Number.isFinite(value)) {
    throw new DomainError('INVALID_COORDINATE');
  }
  return value;
}
