import {
  ApplicationError,
  ListStaffSessionsUseCase,
  RevokeAllStaffSessionsUseCase,
  RevokeStaffSessionUseCase,
} from '@hivork/application';
import {
  ListStaffSessionsQuerySchema,
  RevokeAllStaffSessionsSchema,
} from '@hivork/contracts/auth';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { clearRefreshCookie, refreshCookieName } from '../../auth/auth-cookies';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { StaffContext } from '../../common/types/auth-context';

@Controller('v1/staff/me/sessions')
export class StaffSessionsController {
  constructor(
    private readonly listSessions: ListStaffSessionsUseCase,
    private readonly revokeSession: RevokeStaffSessionUseCase,
    private readonly revokeAllSessions: RevokeAllStaffSessionsUseCase,
  ) {}

  @Get()
  @RequirePermission('core.security.session.view')
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown, @Req() req: Request) {
    const parsed = ListStaffSessionsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    const refreshToken = req.cookies?.[refreshCookieName('staff')] as string | undefined;

    try {
      return await this.listSessions.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        status: parsed.data.status,
        currentRefreshToken: refreshToken,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':sessionId')
  @RequirePermission('core.security.session.manage')
  @HttpCode(HttpStatus.OK)
  async revokeOne(
    @CurrentStaff() staff: StaffContext,
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[refreshCookieName('staff')] as string | undefined;

    try {
      const result = await this.revokeSession.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        actorStaffId: staff.id,
        sessionId,
        currentRefreshToken: refreshToken,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (result.revokedCurrent) {
        clearRefreshCookie(res, 'staff');
      }

      return { success: true as const };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('revoke-all')
  @RequirePermission('core.security.session.manage')
  @HttpCode(HttpStatus.OK)
  async revokeAll(
    @CurrentStaff() staff: StaffContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const parsed = RevokeAllStaffSessionsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const refreshToken = req.cookies?.[refreshCookieName('staff')] as string | undefined;

    try {
      const result = await this.revokeAllSessions.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        actorStaffId: staff.id,
        includeCurrent: parsed.data.includeCurrent,
        currentRefreshToken: refreshToken,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (result.revokedCurrent) {
        clearRefreshCookie(res, 'staff');
      }

      return { revokedCount: result.revokedCount };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof ApplicationError) {
      return new HttpException(
        { code: error.code, message: error.message, details: error.details },
        error.httpStatus,
      );
    }

    throw error;
  }
}
