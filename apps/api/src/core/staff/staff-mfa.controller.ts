import {
  ApplicationError,
  DisableTotpUseCase,
  RegenerateTotpBackupCodesUseCase,
  SetupTotpUseCase,
  VerifyTotpSetupUseCase,
} from '@hivork/application';
import {
  TotpDisableSchema,
  TotpRegenerateBackupCodesSchema,
  TotpVerifySetupSchema,
} from '@hivork/contracts/auth';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import { RequireAuth } from '../../common/decorators/require-auth.decorator';
import type { StaffContext } from '../../common/types/auth-context';

@Controller('v1/staff/me/mfa/totp')
@RequireAuth('staff')
export class StaffMfaController {
  constructor(
    private readonly setupTotp: SetupTotpUseCase,
    private readonly verifyTotpSetup: VerifyTotpSetupUseCase,
    private readonly disableTotp: DisableTotpUseCase,
    private readonly regenerateBackupCodes: RegenerateTotpBackupCodesUseCase,
  ) {}

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  async setup(@CurrentStaff() staff: StaffContext) {
    try {
      return await this.setupTotp.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        actorStaffId: staff.id,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@CurrentStaff() staff: StaffContext, @Body() body: unknown) {
    const parsed = TotpVerifySetupSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.verifyTotpSetup.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        actorStaffId: staff.id,
        code: parsed.data.code,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async disable(@CurrentStaff() staff: StaffContext, @Body() body: unknown) {
    const parsed = TotpDisableSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.disableTotp.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        actorStaffId: staff.id,
        password: parsed.data.password,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('backup-codes')
  @HttpCode(HttpStatus.OK)
  async backupCodes(@CurrentStaff() staff: StaffContext, @Body() body: unknown) {
    const parsed = TotpRegenerateBackupCodesSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.regenerateBackupCodes.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        actorStaffId: staff.id,
        password: parsed.data.password,
      });
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
