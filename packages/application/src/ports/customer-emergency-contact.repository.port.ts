import type { OutboxTransaction } from './outbox.port.js';
import type {
  RestoreCommand,
  SoftDeleteCommand,
} from './soft-deletable.repository.port.js';

export type EmergencyContactRelation = 'parent' | 'spouse' | 'sibling' | 'other';

export type CustomerEmergencyContactRecord = {
  id: string;
  tenantId: string;
  tenantCustomerId: string;
  name: string;
  phone: string;
  relation: EmergencyContactRelation;
  isPrimary: boolean;
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

export type CreateCustomerEmergencyContactItem = {
  name: string;
  phone: string;
  relation?: EmergencyContactRelation;
  isPrimary?: boolean;
  metadata?: Record<string, unknown>;
};

export type CreateCustomerEmergencyContactsInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorStaffId: string;
  items: CreateCustomerEmergencyContactItem[];
};

export type SyncCustomerEmergencyContactItem = CreateCustomerEmergencyContactItem & {
  id?: string;
};

export type SyncCustomerEmergencyContactsInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorStaffId: string;
  items: SyncCustomerEmergencyContactItem[];
};

export type ListCustomerEmergencyContactsOptions = {
  tenantId: string;
  tenantCustomerId: string;
  includeDeleted?: boolean;
};

export interface ICustomerEmergencyContactRepository {
  listByCustomerId(
    options: ListCustomerEmergencyContactsOptions,
  ): Promise<CustomerEmergencyContactRecord[]>;
  createMany(
    input: CreateCustomerEmergencyContactsInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerEmergencyContactRecord[]>;
  syncMany(
    input: SyncCustomerEmergencyContactsInput,
    tx?: OutboxTransaction,
  ): Promise<CustomerEmergencyContactRecord[]>;
  softDelete(command: SoftDeleteCommand): Promise<CustomerEmergencyContactRecord>;
  restore(command: RestoreCommand): Promise<CustomerEmergencyContactRecord>;
}

export const CUSTOMER_EMERGENCY_CONTACT_REPOSITORY = Symbol(
  'CUSTOMER_EMERGENCY_CONTACT_REPOSITORY',
);
