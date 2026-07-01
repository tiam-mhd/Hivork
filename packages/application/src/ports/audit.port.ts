import type { OutboxTransaction } from './outbox.port.js';

export type ActorType = 'staff' | 'customer' | 'system' | 'platform';

export type AuditLogInput = {
  tenantId?: string;
  actorType: ActorType;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export type AuditLogRecord = AuditLogInput & {
  id: string;
  createdAt: Date;
};

export type AuditFindQuery = {
  tenantId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
};

export interface AuditService {
  log(entry: AuditLogInput, tx?: OutboxTransaction): Promise<void>;
  find(query: AuditFindQuery): Promise<AuditLogRecord[]>;
}

/** @deprecated Use AuditService.log */
export type AuditLogEntry = AuditLogInput;

/** @deprecated Use AuditService */
export interface IAuditLogPort extends AuditService {
  append(entry: AuditLogEntry): Promise<void>;
}

export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');
