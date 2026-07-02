import { IStaffRepository } from '@hivork/application';
import { JwtTokenService, PrismaStaffRepository, RedisStaffActiveBranchStore } from '@hivork/infrastructure';
import { Staff } from '@hivork/domain';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import type { StaffContext } from '../types/auth-context.js';
import { extractAccessToken, readBranchHeader } from '../utils/auth-request.util.js';

@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtTokenService) private readonly tokens: JwtTokenService,
    @Inject(PrismaStaffRepository) private readonly staffRepository: IStaffRepository,
    @Inject(RedisStaffActiveBranchStore) private readonly activeBranchStore: RedisStaffActiveBranchStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractAccessToken(request);
    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authorization header is missing.',
      });
    }

    const payload = await this.tokens.verifyAccessToken(token);
    if (!payload) {
      throw new UnauthorizedException({
        code: 'TOKEN_EXPIRED',
        message: 'Access token is invalid or expired.',
      });
    }

    if (payload.actor !== 'staff') {
      throw new ForbiddenException({
        code: 'WRONG_ACTOR',
        message: 'Staff access token required.',
      });
    }

    const record = await this.staffRepository.findContextById(payload.sub);
    if (!record || record.status !== 'active') {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Staff account is not available.',
      });
    }

    if (record.tenantId !== payload.tenantId) {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Token tenant mismatch.',
      });
    }

    const staff = new Staff(
      record.id,
      record.tenantId,
      record.phone,
      record.name,
      record.status,
      record.dataScope,
      record.assignedBranchIds,
      record.primaryBranchId,
    );

    const activeBranchId = await this.resolveActiveBranchId(request, staff.id);
    if (activeBranchId && !staff.canAccessBranch(activeBranchId)) {
      throw new ForbiddenException({
        code: 'BRANCH_NOT_ALLOWED',
        message: 'Active branch is not assigned to this staff.',
      });
    }

    const staffContext: StaffContext = {
      id: staff.id,
      tenantId: staff.tenantId,
      dataScope: staff.dataScope,
      assignedBranchIds: [...staff.assignedBranchIds],
      primaryBranchId: staff.primaryBranchId,
      activeBranchId,
    };

    (request as Request & Record<string, unknown>)[STAFF_CONTEXT_KEY] = staffContext;
    return true;
  }

  private async resolveActiveBranchId(request: Request, staffId: string): Promise<string | null> {
    const headerBranchId = readBranchHeader(request);
    if (headerBranchId) {
      return headerBranchId;
    }

    return this.activeBranchStore.get(staffId);
  }
}
