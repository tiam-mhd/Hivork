import type { OutboxTransaction } from './outbox.port.js';
import type {
  RestoreCommand,
  SoftDeleteCommand,
} from './soft-deletable.repository.port.js';

export type CustomerContactPhoneLabel = 'mobile' | 'home' | 'work' | 'other';

export type CustomerContactPhoneRecord = {
  id: string;
  tenantId: string;
  tenantCustomerId: string;
  phone: string;
  label: CustomerContactPhoneLabel;
  isWhatsApp: boolean;
  isPrimarySecondary: boolean;
  isVerified: boolean;
  notes: string | null;
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

export type UpsertCustomerContactPhoneItem = {
  id?: string;
  phone: string;
  label?: CustomerContactPhoneLabel;
  isWhatsApp?: boolean;
  isPrimarySecondary?: boolean;
  isVerified?: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export type CreateCustomerContactPhonesInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorStaffId: string;
  primaryUserPhone: string;
  items: UpsertCustomerContactPhoneItem[];
};

export type SyncCustomerContactPhoneItem = UpsertCustomerContactPhoneItem & { id?: string };

export type SyncCustomerContactPhonesInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorStaffId: string;
  primaryUserPhone: string;
  items: SyncCustomerContactPhoneItem[];
};

export type UpsertCustomerContactPhonesInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorStaffId: string;
  items: UpsertCustomerContactPhoneItem[];
};

export type ListCustomerContactPhonesOptions = {
  tenantId: string;
  tenantCustomerId: string;
  includeDeleted?: boolean;
};

/** Repository port — Prisma implementation in IFP-036. */
export interface ICustomerContactPhoneRepository {
  findById(id: string, tenantId: string): Promise<CustomerContactPhoneRecord | null>;
  findByPhone(tenantId: string, phone: string): Promise<CustomerContactPhoneRecord | null>;
  listByCustomerId(options: ListCustomerContactPhonesOptions): Promise<CustomerContactPhoneRecord[]>;
  createMany(
    input: CreateCustomerContactPhonesInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerContactPhoneRecord[]>;
  syncMany(
    input: SyncCustomerContactPhonesInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerContactPhoneRecord[]>;
  upsertMany(input: UpsertCustomerContactPhonesInput): Promise<CustomerContactPhoneRecord[]>;
  softDelete(command: SoftDeleteCommand): Promise<CustomerContactPhoneRecord>;
  restore(command: RestoreCommand): Promise<CustomerContactPhoneRecord>;
}

export const CUSTOMER_CONTACT_PHONE_REPOSITORY = Symbol('CUSTOMER_CONTACT_PHONE_REPOSITORY');
