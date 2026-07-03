import type { AuditLogRecord } from '../ports/audit.port.js';

export type CheckTrackingTimelineEvent = {
  at: string;
  action: string;
  actorStaffId?: string;
  note: string | null;
};

export function mapAuditRecordToTimelineEvent(record: AuditLogRecord): CheckTrackingTimelineEvent {
  const newValue =
    record.newValue && typeof record.newValue === 'object' && !Array.isArray(record.newValue)
      ? (record.newValue as Record<string, unknown>)
      : undefined;

  let note: string | null = null;
  if (record.action === 'check.bounce' && typeof newValue?.bounceReason === 'string') {
    note = newValue.bounceReason;
  } else if (record.action === 'check.transfer' && typeof newValue?.transferReason === 'string') {
    note = newValue.transferReason;
  } else if (record.action === 'check.tracking.note' && typeof newValue?.body === 'string') {
    note = newValue.body;
  }

  return {
    at: record.createdAt.toISOString(),
    action: record.action,
    ...(record.actorType === 'staff' ? { actorStaffId: record.actorId } : {}),
    note,
  };
}
