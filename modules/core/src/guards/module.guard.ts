import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRE_MODULE_KEY } from '../decorators/require-module.decorator.js';
import { ModuleEntitlementService } from '../module-entitlement.service.js';
import { ModuleRegistryService } from '../module-registry.service.js';
import {
  TENANT_ID_RESOLVER,
  type TenantIdResolver,
} from '../ports/tenant-id-resolver.port.js';

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRegistry: ModuleRegistryService,
    private readonly moduleEntitlement: ModuleEntitlementService,
    @Inject(TENANT_ID_RESOLVER) private readonly tenantIdResolver: TenantIdResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleCode = this.reflector.getAllAndOverride<string | undefined>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!moduleCode) {
      return true;
    }

    if (!this.moduleRegistry.get(moduleCode)) {
      throw new ForbiddenException({
        code: 'MODULE_NOT_ENABLED',
        message: `Module "${moduleCode}" is not registered.`,
      });
    }

    const tenantId = this.tenantIdResolver.resolveTenantId(context);
    if (!tenantId) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Tenant context is missing.',
      });
    }

    const enabled = await this.moduleEntitlement.isModuleEnabled(tenantId, moduleCode);
    if (!enabled) {
      throw new ForbiddenException({
        code: 'MODULE_NOT_ENABLED',
        message: `Module "${moduleCode}" is not enabled for this tenant.`,
      });
    }

    return true;
  }
}
