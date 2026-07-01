import type { IDeviceLabelParser } from './ports/staff-session.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';
import type { ISettingsSchemaRegistry } from '../ports/settings-schema-registry.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import { resolveEffectiveSettings } from '../settings/resolve-effective-settings.js';
import {
  detectNewIp,
  toLoginSnapshot,
  type LoginSnapshot,
  type RecordStaffLoginInput,
} from './login-snapshot.js';

export type LoginContext = {
  ipAddress?: string;
  userAgent?: string;
};

export type RecordLoginResult = {
  previous: LoginSnapshot | null;
  newIpAlert: boolean;
};

export class RecordLoginService {
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly userRepository: IUserRepository,
    private readonly deviceLabelParser: IDeviceLabelParser,
    private readonly settingsRepository: ITenantSettingsRepository,
    private readonly schemaRegistry: ISettingsSchemaRegistry,
  ) {}

  async recordStaffLogin(
    staffId: string,
    tenantId: string,
    userId: string,
    ctx: LoginContext,
  ): Promise<RecordLoginResult> {
    const at = new Date();
    const deviceLabel = this.deviceLabelParser.parse(ctx.userAgent) ?? undefined;
    const input: RecordStaffLoginInput = {
      ipAddress: ctx.ipAddress,
      deviceLabel,
      at,
    };

    const previous = await this.staffRepository.recordStaffLogin(staffId, tenantId, input);
    await this.userRepository.recordUserLogin(userId, {
      ipAddress: ctx.ipAddress,
      at,
    });

    const alertEnabled = await this.isNewIpAlertEnabled(tenantId);
    const newIpAlert =
      alertEnabled && detectNewIp(previous.previousIp, ctx.ipAddress);

    return {
      previous: toLoginSnapshot(
        previous.previousAt,
        previous.previousIp,
        previous.previousDeviceLabel,
      ),
      newIpAlert,
    };
  }

  private async isNewIpAlertEnabled(tenantId: string): Promise<boolean> {
    const schema = this.schemaRegistry.getSchema('core');
    if (!schema) {
      return true;
    }

    const stored = await this.settingsRepository.findByModule(tenantId, 'core');
    const settings = resolveEffectiveSettings(schema, stored);
    return settings.security_alert_new_ip === true;
  }
}
