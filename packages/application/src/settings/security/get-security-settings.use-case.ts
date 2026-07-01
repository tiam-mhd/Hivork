import type { SecuritySettingsDto } from '@hivork/contracts';
import { Ipv4OrCidrSchema } from '@hivork/contracts';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import { mergeSecuritySettings } from './merge-security-settings.js';

export type GetSecuritySettingsInput = {
  tenantId: string;
};

export type GetSecuritySettingsOutput = {
  security: SecuritySettingsDto;
};

export class GetSecuritySettingsUseCase
  implements UseCase<GetSecuritySettingsInput, GetSecuritySettingsOutput>
{
  constructor(private readonly settingsRepository: ITenantSettingsRepository) {}

  async execute(input: GetSecuritySettingsInput): Promise<GetSecuritySettingsOutput> {
    const stored = await this.settingsRepository.findByModule(input.tenantId, 'core');

    return {
      security: mergeSecuritySettings(stored),
    };
  }
}

export function assertValidIpv4CidrEntries(cidrs: readonly string[]): void {
  for (const entry of cidrs) {
    const parsed = Ipv4OrCidrSchema.safeParse(entry);
    if (!parsed.success) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid IPv4 CIDR entry.', 400, { entry });
    }

    const host = entry.split('/')[0] ?? entry;
    const octets = host.split('.').map((part) => Number(part));
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid IPv4 CIDR entry.', 400, { entry });
    }

    if (entry.includes('/')) {
      const prefix = Number(entry.split('/')[1]);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        throw new ApplicationError('VALIDATION_ERROR', 'Invalid IPv4 CIDR prefix.', 400, { entry });
      }
    }
  }
}
