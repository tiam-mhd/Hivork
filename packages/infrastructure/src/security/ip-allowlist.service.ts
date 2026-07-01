import {
  ApplicationError,
  resolveEffectiveSettings,
  type AuditService,
  type IIpAllowlistPort,
  type IpAllowlistAssertInput,
  type ISettingsSchemaRegistry,
  type ITenantSettingsRepository,
} from '@hivork/application';
import { coreSettingsSchema } from '@hivork/module-core';
import { Injectable } from '@nestjs/common';

import { isClientIpAllowed } from './ip-match.js';

const CORE_MODULE = 'core';
const SECURITY_IP_ALLOWLIST_ENABLED = 'security_ip_allowlist_enabled';
const SECURITY_IP_ALLOWLIST_CIDRS = 'security_ip_allowlist_cidrs';

@Injectable()
export class IpAllowlistService implements IIpAllowlistPort {
  constructor(
    private readonly settingsRepository: ITenantSettingsRepository,
    private readonly schemaRegistry: ISettingsSchemaRegistry,
    private readonly audit: AuditService,
    private readonly bypassToken: string,
  ) {}

  async assertStaffLoginAllowed(input: IpAllowlistAssertInput): Promise<void> {
    if (input.bypassToken && input.bypassToken === this.bypassToken) {
      return;
    }

    const policy = await this.resolvePolicy(input.tenantId);
    if (!policy.enabled) {
      return;
    }

    if (!isClientIpAllowed(input.clientIp, policy.cidrs)) {
      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'system',
        actorId: '00000000-0000-0000-0000-000000000000',
        action: 'security.ip_allowlist.denied',
        entityType: 'staff_login',
        entityId: input.tenantId,
        ip: input.clientIp,
        metadata: {
          clientIp: input.clientIp,
          cidrsCount: policy.cidrs.length,
          ...input.auditMetadata,
        },
      });

      throw new ApplicationError(
        'AUTH_IP_NOT_ALLOWED',
        'Login from this IP address is not allowed.',
        403,
      );
    }
  }

  private async resolvePolicy(tenantId: string): Promise<{ enabled: boolean; cidrs: string[] }> {
    const schema = this.schemaRegistry.getSchema(CORE_MODULE) ?? coreSettingsSchema;
    const stored = await this.settingsRepository.findByModule(tenantId, CORE_MODULE);
    const effective = resolveEffectiveSettings(schema, stored);

    const enabled = effective[SECURITY_IP_ALLOWLIST_ENABLED];
    const cidrs = effective[SECURITY_IP_ALLOWLIST_CIDRS];

    return {
      enabled: typeof enabled === 'boolean' ? enabled : false,
      cidrs: Array.isArray(cidrs)
        ? cidrs.filter((entry): entry is string => typeof entry === 'string')
        : [],
    };
  }
}
