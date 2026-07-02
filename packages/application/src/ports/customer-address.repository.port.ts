import type { OutboxTransaction } from './outbox.port.js';
import type {
  RestoreCommand,
  SoftDeleteCommand,
} from './soft-deletable.repository.port.js';

export type CustomerAddressLabel = 'home' | 'work' | 'billing' | 'other';

export type CustomerAddressRecord = {
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
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
};

export type CreateCustomerAddressItem = {
  label?: CustomerAddressLabel;
  line1: string;
  line2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  isPrimary?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, unknown>;
};

export type CreateCustomerAddressesInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorStaffId: string;
  items: CreateCustomerAddressItem[];
};

export type SyncCustomerAddressItem = CreateCustomerAddressItem & { id?: string };

export type SyncCustomerAddressesInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorStaffId: string;
  items: SyncCustomerAddressItem[];
};

export type ListCustomerAddressesOptions = {
  tenantId: string;
  tenantCustomerId: string;
  includeDeleted?: boolean;
};

export interface ICustomerAddressRepository {
  listByCustomerId(options: ListCustomerAddressesOptions): Promise<CustomerAddressRecord[]>;
  createMany(
    input: CreateCustomerAddressesInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerAddressRecord[]>;
  syncMany(
    input: SyncCustomerAddressesInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerAddressRecord[]>;
  softDelete(command: SoftDeleteCommand): Promise<CustomerAddressRecord>;
  restore(command: RestoreCommand): Promise<CustomerAddressRecord>;
}

export const CUSTOMER_ADDRESS_REPOSITORY = Symbol('CUSTOMER_ADDRESS_REPOSITORY');
