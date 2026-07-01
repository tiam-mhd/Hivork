import {
  ApplicationError,
  ConfirmChangePhoneUseCase,
  InitChangePhoneUseCase,
  RequestCurrentPhoneOtpUseCase,
  RequestNewPhoneOtpUseCase,
  VerifyCurrentPhoneOtpUseCase,
} from '@hivork/application';
import {
  ChangePhoneConfirmResponseSchema,
  ChangePhoneInitSchema,
  ChangePhoneRequestNewSchema,
  ChangePhoneSessionSchema,
  ChangePhoneVerifyOtpSchema,
} from '@hivork/contracts/auth';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { StaffContext } from '../../common/types/auth-context';

@Controller('v1/staff/me/phone/change')
@RequirePermission('core.security.phone.change')
export class StaffPhoneController {
  constructor(
    private readonly initChangePhone: InitChangePhoneUseCase,
    private readonly requestCurrentPhoneOtp: RequestCurrentPhoneOtpUseCase,
    private readonly verifyCurrentPhoneOtp: VerifyCurrentPhoneOtpUseCase,
    private readonly requestNewPhoneOtp: RequestNewPhoneOtpUseCase,
    private readonly confirmChangePhone: ConfirmChangePhoneUseCase,
  ) {}

  @Post('init')
  @HttpCode(HttpStatus.OK)
  async init(@CurrentStaff() staff: StaffContext, @Body() body: unknown) {
    const parsed = ChangePhoneInitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.initChangePhone.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        actorStaffId: staff.id,
        password: parsed.data.password,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('request-current')
  @HttpCode(HttpStatus.OK)
  async requestCurrent(@CurrentStaff() staff: StaffContext, @Body() body: unknown) {
    const parsed = ChangePhoneSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.requestCurrentPhoneOtp.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        actorStaffId: staff.id,
        changeSessionId: parsed.data.changeSessionId,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('verify-current')
  @HttpCode(HttpStatus.OK)
  async verifyCurrent(@CurrentStaff() staff: StaffContext, @Body() body: unknown) {
    const parsed = ChangePhoneVerifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.verifyCurrentPhoneOtp.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        actorStaffId: staff.id,
        changeSessionId: parsed.data.changeSessionId,
        code: parsed.data.code,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('request-new')
  @HttpCode(HttpStatus.OK)
  async requestNew(@CurrentStaff() staff: StaffContext, @Body() body: unknown) {
    const parsed = ChangePhoneRequestNewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      return await this.requestNewPhoneOtp.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        actorStaffId: staff.id,
        changeSessionId: parsed.data.changeSessionId,
        newPhone: parsed.data.newPhone,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(@CurrentStaff() staff: StaffContext, @Body() body: unknown) {
    const parsed = ChangePhoneVerifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.confirmChangePhone.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        actorStaffId: staff.id,
        changeSessionId: parsed.data.changeSessionId,
        code: parsed.data.code,
      });
      return ChangePhoneConfirmResponseSchema.parse(result);
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
