import { randomUUID } from 'node:crypto';

import { DomainError } from '../errors/domain.error.js';
import { MAX_SALE_LINE_ITEMS_PER_SALE } from './sale-line-item.constants.js';
import type {
  ComputeLineTotalInput,
  CreateSaleLineItemInput,
  SaleLineItemProps,
} from './sale-line-item.types.js';

const MAX_TITLE_LENGTH = 200;
const MAX_SKU_LENGTH = 64;
const MIN_QUANTITY = 1;

/** Pure function: quantity * unitPrice - discount + tax (bigint exact). */
export function computeLineTotal(input: ComputeLineTotalInput): bigint {
  assertQuantity(input.quantity);

  if (input.unitPriceRial <= 0n) {
    throw new DomainError('AMOUNT_INVALID');
  }

  const discountRial = input.discountRial ?? 0n;
  const taxRial = input.taxRial ?? 0n;

  if (discountRial < 0n || taxRial < 0n) {
    throw new DomainError('AMOUNT_INVALID');
  }

  const subtotalRial = BigInt(input.quantity) * input.unitPriceRial;

  if (discountRial > subtotalRial) {
    throw new DomainError('DISCOUNT_EXCEEDS_LINE_TOTAL');
  }

  return subtotalRial - discountRial + taxRial;
}

export class SaleLineItem {
  private constructor(private props: SaleLineItemProps) {}

  static assertLimit(activeCount: number): void {
    if (activeCount >= MAX_SALE_LINE_ITEMS_PER_SALE) {
      throw new DomainError('LINE_ITEM_LIMIT_EXCEEDED');
    }
  }

  static create(input: CreateSaleLineItemInput): SaleLineItem {
    const quantity = input.quantity ?? MIN_QUANTITY;
    const discountRial = input.discountRial ?? 0n;
    const taxRial = input.taxRial ?? 0n;
    const lineTotalRial = computeLineTotal({
      quantity,
      unitPriceRial: input.unitPriceRial,
      discountRial,
      taxRial,
    });

    const now = new Date();

    return new SaleLineItem({
      id: randomUUID(),
      tenantId: input.tenantId,
      saleId: input.saleId,
      title: normalizeTitle(input.title),
      sku: normalizeSku(input.sku),
      quantity,
      unitPriceRial: input.unitPriceRial,
      discountRial,
      taxRial,
      lineTotalRial,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
      createdById: input.createdById,
      updatedById: input.createdById,
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
      metadata: input.metadata ?? null,
    });
  }

  static reconstitute(props: SaleLineItemProps): SaleLineItem {
    return new SaleLineItem(props);
  }

  get id(): string {
    return this.props.id;
  }

  get lineTotalRial(): bigint {
    return this.props.lineTotalRial;
  }

  get title(): string {
    return this.props.title;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  toProps(): SaleLineItemProps {
    return { ...this.props };
  }

  update(props: {
    title?: string;
    sku?: string | null;
    quantity?: number;
    unitPriceRial?: bigint;
    discountRial?: bigint;
    taxRial?: bigint;
    sortOrder?: number;
    updatedById: string;
  }): void {
    this.assertActive();

    const quantity = props.quantity ?? this.props.quantity;
    const unitPriceRial = props.unitPriceRial ?? this.props.unitPriceRial;
    const discountRial = props.discountRial ?? this.props.discountRial;
    const taxRial = props.taxRial ?? this.props.taxRial;

    this.props.lineTotalRial = computeLineTotal({
      quantity,
      unitPriceRial,
      discountRial,
      taxRial,
    });

    if (props.title !== undefined) {
      this.props.title = normalizeTitle(props.title);
    }

    if (props.sku !== undefined) {
      this.props.sku = normalizeSku(props.sku);
    }

    if (props.quantity !== undefined) {
      this.props.quantity = quantity;
    }

    if (props.unitPriceRial !== undefined) {
      this.props.unitPriceRial = unitPriceRial;
    }

    if (props.discountRial !== undefined) {
      this.props.discountRial = discountRial;
    }

    if (props.taxRial !== undefined) {
      this.props.taxRial = taxRial;
    }

    if (props.sortOrder !== undefined) {
      this.props.sortOrder = props.sortOrder;
    }

    this.props.updatedById = props.updatedById;
    this.props.updatedAt = new Date();
  }

  softDelete(deletedById: string, reason?: string): void {
    if (this.isDeleted) {
      throw new DomainError('ALREADY_DELETED');
    }

    this.props.deletedAt = new Date();
    this.props.deletedById = deletedById;
    this.props.deleteReason = reason?.trim() || null;
    this.props.updatedById = deletedById;
    this.props.updatedAt = new Date();
  }

  private assertActive(): void {
    if (this.isDeleted) {
      throw new DomainError('LINE_ITEM_DELETED');
    }
  }
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY) {
    throw new DomainError('QUANTITY_INVALID');
  }
}

function normalizeTitle(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new DomainError('FIELD_REQUIRED');
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}

function normalizeSku(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_SKU_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }

  return trimmed;
}
