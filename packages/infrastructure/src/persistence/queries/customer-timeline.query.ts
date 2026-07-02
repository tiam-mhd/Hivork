import type {
  CustomerTimelineEventRecord,
  CustomerTimelineEventType,
  ICustomerTimelineRepository,
  ListCustomerTimelineOptions,
} from '@hivork/application';
import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

type RawTimelineRow = {
  composite_id: string;
  event_type: string;
  occurred_at: Date;
  title: string;
  summary: string | null;
  actor_type: string | null;
  actor_id: string | null;
  actor_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: unknown;
};

const ALL_TYPES: CustomerTimelineEventType[] = [
  'payment',
  'contract',
  'sms',
  'notification',
  'note',
  'call',
  'audit',
];

@Injectable()
export class CustomerTimelineQuery implements ICustomerTimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(options: ListCustomerTimelineOptions): Promise<CustomerTimelineEventRecord[]> {
    const enabledTypes = options.types?.length ? options.types : ALL_TYPES.filter((t) => t !== 'call');
    const unions: Prisma.Sql[] = [];

    if (enabledTypes.includes('payment')) {
      unions.push(this.paymentUnion(options));
    }
    if (enabledTypes.includes('contract')) {
      unions.push(this.contractUnion(options));
    }
    if (enabledTypes.includes('note')) {
      unions.push(this.noteUnion(options));
    }
    if (enabledTypes.includes('sms') || enabledTypes.includes('notification')) {
      unions.push(this.notificationUnion(options, enabledTypes));
    }
    if (enabledTypes.includes('audit')) {
      unions.push(this.auditUnion(options));
    }

    if (unions.length === 0) {
      return [];
    }

    const unionSql =
      unions.length === 1 ? unions[0]! : Prisma.sql`${Prisma.join(unions, ' UNION ALL ')}`;

    const rows = await this.prisma.$queryRaw<RawTimelineRow[]>`
      SELECT *
      FROM (${unionSql}) AS timeline_events
      ORDER BY occurred_at DESC, composite_id DESC
      LIMIT ${options.limit}
    `;

    return rows.map((row) => this.toRecord(row));
  }

  private scopeSql(options: ListCustomerTimelineOptions, saleAlias: string): Prisma.Sql {
    switch (options.scope.dataScope) {
      case 'all':
        return Prisma.empty;
      case 'branch':
        if (options.scope.branchIds.length === 0) {
          return Prisma.sql`AND 1 = 0`;
        }
        return Prisma.sql`AND ${Prisma.raw(saleAlias)}.branch_id IN (${Prisma.join(
          options.scope.branchIds.map((id: string) => Prisma.sql`${id}::uuid`),
        )})`;
      case 'own':
        return Prisma.sql`AND ${Prisma.raw(saleAlias)}.created_by_staff_id = ${options.scope.staffId}::uuid`;
    }
  }

  private dateRangeSql(options: ListCustomerTimelineOptions, column: string): Prisma.Sql {
    const parts: Prisma.Sql[] = [];
    if (options.occurredFrom) {
      parts.push(Prisma.sql`${Prisma.raw(column)} >= ${options.occurredFrom}`);
    }
    if (options.occurredTo) {
      parts.push(Prisma.sql`${Prisma.raw(column)} <= ${options.occurredTo}`);
    }
    if (parts.length === 0) {
      return Prisma.empty;
    }
    return Prisma.sql`AND ${Prisma.join(parts, ' AND ')}`;
  }

  private paymentUnion(options: ListCustomerTimelineOptions): Prisma.Sql {
    return Prisma.sql`
      SELECT
        ('payment:' || pa.id::text) AS composite_id,
        'payment'::text AS event_type,
        COALESCE(pa.confirmed_at, pa.created_at) AS occurred_at,
        'پرداخت تأیید شد'::text AS title,
        ('مبلغ ' || pa.amount_rial::text || ' ریال — قسط ' || i.sequence_number::text)::text AS summary,
        'staff'::text AS actor_type,
        pa.confirmed_by_staff_id::text AS actor_id,
        NULL::text AS actor_name,
        'payment_attempt'::text AS entity_type,
        pa.id::text AS entity_id,
        jsonb_build_object(
          'status', pa.status,
          'installmentId', pa.installment_id,
          'saleId', s.id,
          'amountRial', pa.amount_rial::text
        ) AS metadata
      FROM payment_attempts pa
      INNER JOIN installments i ON i.id = pa.installment_id AND i.deleted_at IS NULL
      INNER JOIN sales s ON s.id = i.sale_id AND s.deleted_at IS NULL
      WHERE pa.tenant_id = ${options.tenantId}::uuid
        AND s.tenant_customer_id = ${options.tenantCustomerId}::uuid
        AND pa.deleted_at IS NULL
        AND pa.status = 'CONFIRMED'
        ${this.scopeSql(options, 's')}
        ${this.dateRangeSql(options, 'COALESCE(pa.confirmed_at, pa.created_at)')}
        ${options.cursor ? Prisma.sql`AND (
          COALESCE(pa.confirmed_at, pa.created_at) < ${options.cursor.occurredAt}
          OR (
            COALESCE(pa.confirmed_at, pa.created_at) = ${options.cursor.occurredAt}
            AND ('payment:' || pa.id::text) < ${options.cursor.id}
          )
        )` : Prisma.empty}
    `;
  }

  private contractUnion(options: ListCustomerTimelineOptions): Prisma.Sql {
    return Prisma.sql`
      SELECT
        ('contract:' || s.id::text) AS composite_id,
        'contract'::text AS event_type,
        s.created_at AS occurred_at,
        CASE
          WHEN s.status = 'CANCELLED' THEN 'قرارداد لغو شد'
          ELSE 'قرارداد جدید ثبت شد'
        END::text AS title,
        COALESCE(s.title, 'قرارداد اقساطی')::text AS summary,
        'staff'::text AS actor_type,
        s.created_by_staff_id::text AS actor_id,
        NULL::text AS actor_name,
        'sale'::text AS entity_type,
        s.id::text AS entity_id,
        jsonb_build_object(
          'status', s.status,
          'totalAmountRial', s.total_amount_rial::text,
          'installmentCount', s.installment_count
        ) AS metadata
      FROM sales s
      WHERE s.tenant_id = ${options.tenantId}::uuid
        AND s.tenant_customer_id = ${options.tenantCustomerId}::uuid
        AND s.deleted_at IS NULL
        ${this.scopeSql(options, 's')}
        ${this.dateRangeSql(options, 's.created_at')}
        ${options.cursor ? Prisma.sql`AND (
          s.created_at < ${options.cursor.occurredAt}
          OR (s.created_at = ${options.cursor.occurredAt} AND ('contract:' || s.id::text) < ${options.cursor.id})
        )` : Prisma.empty}
    `;
  }

  private noteUnion(options: ListCustomerTimelineOptions): Prisma.Sql {
    return Prisma.sql`
      SELECT
        ('note:' || cn.id::text) AS composite_id,
        'note'::text AS event_type,
        cn.created_at AS occurred_at,
        'یادداشت داخلی'::text AS title,
        LEFT(cn.body, 200)::text AS summary,
        'staff'::text AS actor_type,
        cn.author_staff_id::text AS actor_id,
        st.name::text AS actor_name,
        'customer_note'::text AS entity_type,
        cn.id::text AS entity_id,
        jsonb_build_object('isPinned', cn.is_pinned) AS metadata
      FROM customer_notes cn
      LEFT JOIN staff st ON st.id = cn.author_staff_id
      WHERE cn.tenant_id = ${options.tenantId}::uuid
        AND cn.tenant_customer_id = ${options.tenantCustomerId}::uuid
        AND cn.deleted_at IS NULL
        ${this.dateRangeSql(options, 'cn.created_at')}
        ${options.cursor ? Prisma.sql`AND (
          cn.created_at < ${options.cursor.occurredAt}
          OR (cn.created_at = ${options.cursor.occurredAt} AND ('note:' || cn.id::text) < ${options.cursor.id})
        )` : Prisma.empty}
    `;
  }

  private notificationUnion(
    options: ListCustomerTimelineOptions,
    enabledTypes: CustomerTimelineEventType[],
  ): Prisma.Sql {
    const channelFilter =
      enabledTypes.includes('sms') && enabledTypes.includes('notification')
        ? Prisma.empty
        : enabledTypes.includes('sms')
          ? Prisma.sql`AND nl.channel = 'sms'`
          : Prisma.sql`AND nl.channel IN ('bale', 'telegram')`;

    return Prisma.sql`
      SELECT
        (
          CASE
            WHEN nl.channel = 'sms' THEN 'sms:' || nl.id::text
            ELSE 'notification:' || nl.id::text
          END
        ) AS composite_id,
        (
          CASE
            WHEN nl.channel = 'sms' THEN 'sms'
            ELSE 'notification'
          END
        )::text AS event_type,
        COALESCE(nl.sent_at, nl.created_at) AS occurred_at,
        (
          CASE
            WHEN nl.channel = 'sms' THEN 'پیامک یادآور ارسال شد'
            WHEN nl.channel = 'bale' THEN 'اعلان بله'
            ELSE 'اعلان ارسال شد'
          END
        )::text AS title,
        COALESCE(nl.reminder_type, nl.status)::text AS summary,
        'system'::text AS actor_type,
        NULL::text AS actor_id,
        NULL::text AS actor_name,
        'notification_log'::text AS entity_type,
        nl.id::text AS entity_id,
        jsonb_build_object(
          'channel', nl.channel,
          'status', nl.status,
          'installmentId', nl.installment_id
        ) AS metadata
      FROM notification_logs nl
      INNER JOIN installments i ON i.id = nl.installment_id AND i.deleted_at IS NULL
      INNER JOIN sales s ON s.id = i.sale_id AND s.deleted_at IS NULL
      WHERE nl.tenant_id = ${options.tenantId}::uuid
        AND s.tenant_customer_id = ${options.tenantCustomerId}::uuid
        AND nl.status IN ('sent', 'scheduled', 'failed', 'skipped')
        ${channelFilter}
        ${this.scopeSql(options, 's')}
        ${this.dateRangeSql(options, 'COALESCE(nl.sent_at, nl.created_at)')}
        ${options.cursor ? Prisma.sql`AND (
          COALESCE(nl.sent_at, nl.created_at) < ${options.cursor.occurredAt}
          OR (
            COALESCE(nl.sent_at, nl.created_at) = ${options.cursor.occurredAt}
            AND (
              CASE
                WHEN nl.channel = 'sms' THEN 'sms:' || nl.id::text
                ELSE 'notification:' || nl.id::text
              END
            ) < ${options.cursor.id}
          )
        )` : Prisma.empty}
    `;
  }

  private auditUnion(options: ListCustomerTimelineOptions): Prisma.Sql {
    return Prisma.sql`
      SELECT
        ('audit:' || al.id::text) AS composite_id,
        'audit'::text AS event_type,
        al.created_at AS occurred_at,
        al.action::text AS title,
        al.entity_type::text AS summary,
        al.actor_type::text AS actor_type,
        al.actor_id::text AS actor_id,
        NULL::text AS actor_name,
        al.entity_type::text AS entity_type,
        al.entity_id::text AS entity_id,
        COALESCE(al.metadata, '{}'::jsonb) AS metadata
      FROM audit_logs al
      WHERE al.tenant_id = ${options.tenantId}::uuid
        AND (
          (al.entity_type = 'tenant_customer' AND al.entity_id = ${options.tenantCustomerId}::uuid)
          OR (
            al.entity_type = 'sale'
            AND al.entity_id IN (
              SELECT s.id FROM sales s
              WHERE s.tenant_id = ${options.tenantId}::uuid
                AND s.tenant_customer_id = ${options.tenantCustomerId}::uuid
                AND s.deleted_at IS NULL
            )
          )
          OR al.action LIKE 'customer.%'
        )
        ${this.dateRangeSql(options, 'al.created_at')}
        ${options.cursor ? Prisma.sql`AND (
          al.created_at < ${options.cursor.occurredAt}
          OR (al.created_at = ${options.cursor.occurredAt} AND ('audit:' || al.id::text) < ${options.cursor.id})
        )` : Prisma.empty}
    `;
  }

  private toRecord(row: RawTimelineRow): CustomerTimelineEventRecord {
    const actorType = row.actor_type;
    const normalizedActorType =
      actorType === 'staff' ||
      actorType === 'customer' ||
      actorType === 'system' ||
      actorType === 'platform'
        ? actorType
        : null;

    return {
      id: row.composite_id,
      type: row.event_type as CustomerTimelineEventType,
      occurredAt: row.occurred_at,
      title: row.title,
      summary: row.summary,
      actorType: normalizedActorType,
      actorId: row.actor_id,
      actorName: row.actor_name,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null,
    };
  }
}
