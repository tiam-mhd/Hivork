import { ApplicationError, buildDataScopeFilter } from '@hivork/application';
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, defer, throwError } from 'rxjs';

import { APPLY_DATA_SCOPE_KEY, STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import { prismaRequestStorage } from '@hivork/infrastructure';
import type { StaffContext } from '../types/auth-context.js';

@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const applyDataScope = this.reflector.getAllAndOverride<boolean>(APPLY_DATA_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!applyDataScope) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const staff = request[STAFF_CONTEXT_KEY] as StaffContext | undefined;

    if (!staff) {
      return throwError(
        () =>
          new UnauthorizedException({
            code: 'UNAUTHORIZED',
            message: 'Staff context is missing.',
          }),
      );
    }

    const parent = prismaRequestStorage.getStore();
    if (!parent) {
      return throwError(
        () =>
          new UnauthorizedException({
            code: 'UNAUTHORIZED',
            message: 'Staff context is missing.',
          }),
      );
    }

    try {
      const filter = buildDataScopeFilter({
        staffId: staff.id,
        dataScope: staff.dataScope,
        assignedBranchIds: staff.assignedBranchIds,
        activeBranchId: staff.activeBranchId,
      });

      return defer(() =>
        prismaRequestStorage.run({ ...parent, dataScopeFilter: filter }, () => next.handle()),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        return throwError(
          () =>
            new HttpException(
              { code: error.code, message: error.message, details: error.details },
              error.httpStatus,
            ),
        );
      }

      return throwError(() => error);
    }
  }
}
