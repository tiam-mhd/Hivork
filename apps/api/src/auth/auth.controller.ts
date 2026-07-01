import {
  ApplicationError,
  ChangeRequiredPasswordUseCase,
  ForgotPasswordRequestUseCase,
  ForgotPasswordVerifyOtpUseCase,
  LogoutUseCase,
  MfaRequestOtpUseCase,
  MfaVerifyUseCase,
  PasswordLoginUseCase,
  RefreshSessionUseCase,
  RequestOtpUseCase,
  ResetPasswordUseCase,
  SetInitialPasswordUseCase,
  VerifyOtpUseCase,
} from '@hivork/application';
import {
  ForgotPasswordRequestSchema,
  ForgotPasswordVerifyOtpSchema,
  LogoutSchema,
  MfaRequestOtpSchema,
  MfaVerifySchema,
  normalizePhone,
  OtpRequestSchema,
  OtpVerifySchema,
  PasswordLoginSchema,
  RefreshSessionSchema,
  ResetPasswordSchema,
  SetInitialPasswordSchema,
  ChangeRequiredPasswordSchema,
} from '@hivork/contracts';
import { JwtTokenService, PrismaStaffRepository } from '@hivork/infrastructure';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Headers,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { z } from 'zod';

import { AppConfigService } from '../config/app-config.service';
import { readClientDeviceContext } from '../common/device-context.js';
import { readCaptchaRequestContext } from './captcha-request-context';
import { readIpAllowlistBypassToken } from './ip-allowlist-request-context.js';
import { clearRefreshCookie, refreshCookieName, setRefreshCookie } from './auth-cookies';
import type { StaffContext } from '../common/types/auth-context.js';

function maskPhone(phone: string): string {
  if (phone.length !== 11) return '***';
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException({
      code: 'AUTH_TOKEN_INVALID',
      message: 'Bearer verified token is required.',
    });
  }
  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new UnauthorizedException({
      code: 'AUTH_TOKEN_INVALID',
      message: 'Bearer verified token is required.',
    });
  }
  return token;
}

@Controller('v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly requestOtpUseCase: RequestOtpUseCase,
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly setInitialPasswordUseCase: SetInitialPasswordUseCase,
    private readonly passwordLoginUseCase: PasswordLoginUseCase,
    private readonly mfaRequestOtpUseCase: MfaRequestOtpUseCase,
    private readonly mfaVerifyUseCase: MfaVerifyUseCase,
    private readonly forgotPasswordRequestUseCase: ForgotPasswordRequestUseCase,
    private readonly forgotPasswordVerifyOtpUseCase: ForgotPasswordVerifyOtpUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changeRequiredPasswordUseCase: ChangeRequiredPasswordUseCase,
    private readonly tokens: JwtTokenService,
    private readonly staffRepository: PrismaStaffRepository,
    private readonly appConfig: AppConfigService,
  ) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(
    @Body() body: unknown,
    @Req() req: Request,
    @Headers('x-captcha-token') captchaHeader?: string,
  ) {
    const parsed = OtpRequestSchema.safeParse(body);
    if (!parsed.success) {
      const phoneIssue = parsed.error.issues.find((issue) => issue.path[0] === 'phone');
      throw new BadRequestException({
        code: phoneIssue ? 'INVALID_PHONE' : 'VALIDATION_ERROR',
        message: phoneIssue?.message ?? 'Invalid request body',
      });
    }

    const phone = normalizePhone(parsed.data.phone);
    const device = readClientDeviceContext(req);
    const captcha = readCaptchaRequestContext(req, parsed.data.captchaToken, captchaHeader);
    this.logger.log({ event: 'otp.requested', phone: maskPhone(phone), actor: parsed.data.actor });

    return this.runUseCase(() =>
      this.requestOtpUseCase.execute({
        phone,
        actor: parsed.data.actor,
        captchaToken: captcha.captchaToken,
        clientIp: device.clientIp,
        captchaBypassToken: captcha.captchaBypassToken,
      }),
    );
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = OtpVerifySchema.safeParse(body);
    if (!parsed.success) {
      const phoneIssue = parsed.error.issues.find((issue) => issue.path[0] === 'phone');
      const codeIssue = parsed.error.issues.find((issue) => issue.path[0] === 'code');
      throw new BadRequestException({
        code: phoneIssue ? 'INVALID_PHONE' : codeIssue ? 'OTP_INVALID' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const device = readClientDeviceContext(req);
    const ipAllowlistBypassToken = readIpAllowlistBypassToken(req);

    const result = await this.runUseCase(() =>
      this.verifyOtpUseCase.execute({
        phone: normalizePhone(parsed.data.phone),
        code: parsed.data.code,
        actor: parsed.data.actor,
        intent: parsed.data.intent,
        tenantSlug: parsed.data.tenantSlug,
        clientIp: device.clientIp,
        ipAllowlistBypassToken,
        userAgent: device.userAgent,
        deviceId: device.deviceId,
        rememberMe: parsed.data.rememberMe,
      }),
    );

    if (result.kind === 'verified') {
      return {
        verifiedToken: result.verifiedToken,
        expiresIn: result.expiresIn,
      };
    }

    setRefreshCookie(res, this.appConfig, parsed.data.actor, result.refreshToken, {
      rememberMe: parsed.data.rememberMe,
    });

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      staff: result.staff,
      tenant: result.tenant,
      customer: result.customer,
      lastLogin: result.lastLogin,
      newIpAlert: result.newIpAlert,
    };
  }

  @Post('password/login')
  @HttpCode(HttpStatus.OK)
  async passwordLogin(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-captcha-token') captchaHeader?: string,
  ) {
    const parsed = PasswordLoginSchema.safeParse(body);
    if (!parsed.success) {
      const phoneIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'phone');
      throw new BadRequestException({
        code: phoneIssue ? 'INVALID_PHONE' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const captchaToken = parsed.data.captchaToken ?? captchaHeader;
    const captcha = readCaptchaRequestContext(req, captchaToken, captchaHeader);
    const device = readClientDeviceContext(req);
    const ipAllowlistBypassToken = readIpAllowlistBypassToken(req);

    const result = await this.runUseCase(() =>
      this.passwordLoginUseCase.execute({
        phone: normalizePhone(parsed.data.phone),
        password: parsed.data.password,
        tenantSlug: parsed.data.tenantSlug,
        rememberMe: parsed.data.rememberMe,
        captchaToken: captcha.captchaToken,
        captchaBypassToken: captcha.captchaBypassToken,
        ipAllowlistBypassToken,
        clientIp: device.clientIp,
        userAgent: device.userAgent,
        deviceId: device.deviceId,
      }),
    );

    if (result.kind === 'must_change_password') {
      res.status(HttpStatus.FORBIDDEN);
      return {
        code: 'AUTH_MUST_CHANGE_PASSWORD',
        message: 'Password change required before login.',
        kind: result.kind,
        changePasswordToken: result.changePasswordToken,
        expiresIn: result.expiresIn,
      };
    }

    if (result.kind === 'mfa_required') {
      return {
        kind: result.kind,
        mfaToken: result.mfaToken,
        expiresIn: result.expiresIn,
        methods: result.methods,
      };
    }

    setRefreshCookie(res, this.appConfig, 'staff', result.refreshToken, {
      rememberMe: parsed.data.rememberMe,
    });

    return {
      kind: result.kind,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      staff: result.staff,
      tenant: result.tenant,
      lastLogin: result.lastLogin,
      newIpAlert: result.newIpAlert,
    };
  }

  @Post('mfa/otp/request')
  @HttpCode(HttpStatus.OK)
  async mfaRequestOtp(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = MfaRequestOtpSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const mfaToken = extractBearerToken(authorization);

    return this.runUseCase(() =>
      this.mfaRequestOtpUseCase.execute({ mfaToken }),
    );
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async mfaVerify(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = MfaVerifySchema.safeParse(body);
    if (!parsed.success) {
      const codeIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'code');
      throw new BadRequestException({
        code: codeIssue ? 'AUTH_OTP_INVALID' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const mfaToken = extractBearerToken(authorization);
    const device = readClientDeviceContext(req);

    const result = await this.runUseCase(() =>
      this.mfaVerifyUseCase.execute({
        mfaToken,
        method: parsed.data.method,
        code: parsed.data.code,
        clientIp: device.clientIp,
        userAgent: device.userAgent,
        deviceId: device.deviceId,
      }),
    );

    setRefreshCookie(res, this.appConfig, 'staff', result.refreshToken, {
      rememberMe: result.rememberMe ?? false,
    });

    return {
      kind: result.kind,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      staff: result.staff,
      tenant: result.tenant,
      lastLogin: result.lastLogin,
      newIpAlert: result.newIpAlert,
    };
  }

  @Post('password/forgot/request')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordRequest(
    @Body() body: unknown,
    @Req() req: Request,
    @Headers('x-captcha-token') captchaHeader?: string,
  ) {
    const parsed = ForgotPasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      const phoneIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'phone');
      throw new BadRequestException({
        code: phoneIssue ? 'INVALID_PHONE' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const device = readClientDeviceContext(req);
    const captcha = readCaptchaRequestContext(req, parsed.data.captchaToken, captchaHeader);

    return this.runUseCase(() =>
      this.forgotPasswordRequestUseCase.execute({
        phone: normalizePhone(parsed.data.phone),
        captchaToken: captcha.captchaToken,
        captchaBypassToken: captcha.captchaBypassToken,
        clientIp: device.clientIp,
      }),
    );
  }

  @Post('password/forgot/verify-otp')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordVerifyOtp(@Body() body: unknown, @Req() req: Request) {
    const parsed = ForgotPasswordVerifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      const phoneIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'phone');
      const codeIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'code');
      throw new BadRequestException({
        code: phoneIssue ? 'INVALID_PHONE' : codeIssue ? 'AUTH_OTP_INVALID' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    return this.runUseCase(() =>
      this.forgotPasswordVerifyOtpUseCase.execute({
        phone: normalizePhone(parsed.data.phone),
        code: parsed.data.code,
        clientIp: req.ip,
      }),
    );
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: unknown, @Req() req: Request) {
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'password');
      const confirmIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'passwordConfirm');
      throw new BadRequestException({
        code: passwordIssue ? 'AUTH_PASSWORD_TOO_WEAK' : confirmIssue ? 'VALIDATION_ERROR' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    return this.runUseCase(() =>
      this.resetPasswordUseCase.execute({
        resetToken: parsed.data.resetToken,
        password: parsed.data.password,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      }),
    );
  }

  @Post('password/change-required')
  @HttpCode(HttpStatus.OK)
  async changeRequiredPassword(
    @Body() body: unknown,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    const parsed = ChangeRequiredPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'newPassword');
      throw new BadRequestException({
        code: passwordIssue ? 'AUTH_PASSWORD_TOO_WEAK' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const staffContext = await this.tryResolveStaffFromAuthorization(authorization);
    if (!parsed.data.changePasswordToken && !staffContext) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Change password token or staff authentication is required.',
      });
    }

    return this.runUseCase(() =>
      this.changeRequiredPasswordUseCase.execute({
        changePasswordToken: parsed.data.changePasswordToken,
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        staffId: staffContext?.id,
        tenantId: staffContext?.tenantId,
        currentRefreshToken: req.cookies?.[refreshCookieName('staff')] as string | undefined,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      }),
    );
  }

  @Post('password/set-initial')
  @HttpCode(HttpStatus.OK)
  async setInitialPassword(
    @Req() req: Request,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = SetInitialPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'password');
      const confirmIssue = parsed.error.issues.find((issue: z.ZodIssue) => issue.path[0] === 'passwordConfirm');
      throw new BadRequestException({
        code: passwordIssue ? 'AUTH_PASSWORD_TOO_WEAK' : confirmIssue ? 'VALIDATION_ERROR' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const verifiedToken = extractBearerToken(authorization);

    return this.runUseCase(() =>
      this.setInitialPasswordUseCase.execute({
        verifiedToken,
        password: parsed.data.password,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      }),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = RefreshSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const refreshToken = this.readRefreshCookie(req, parsed.data.actor);
    const device = readClientDeviceContext(req);

    const result = await this.runUseCase(() =>
      this.refreshSessionUseCase.execute({
        actor: parsed.data.actor,
        refreshToken,
        clientIp: device.clientIp,
        userAgent: device.userAgent,
      }),
    );

    if (result.refreshToken) {
      setRefreshCookie(res, this.appConfig, parsed.data.actor, result.refreshToken, {
        rememberMe: result.rememberMe,
      });
    }

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = LogoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const refreshToken = req.cookies?.[refreshCookieName(parsed.data.actor)] as string | undefined;

    const result = await this.runUseCase(() =>
      this.logoutUseCase.execute({
        actor: parsed.data.actor,
        refreshToken,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      }),
    );

    clearRefreshCookie(res, parsed.data.actor);

    return result;
  }

  private async tryResolveStaffFromAuthorization(
    authorizationHeader?: string,
  ): Promise<StaffContext | null> {
    if (!authorizationHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    if (!token) {
      return null;
    }

    const payload = await this.tokens.verifyAccessToken(token);
    if (!payload || payload.actor !== 'staff') {
      return null;
    }

    const record = await this.staffRepository.findContextById(payload.sub);
    if (!record || record.status !== 'active' || record.tenantId !== payload.tenantId) {
      return null;
    }

    return {
      id: record.id,
      tenantId: record.tenantId,
      dataScope: record.dataScope,
      assignedBranchIds: [...record.assignedBranchIds],
      primaryBranchId: record.primaryBranchId,
      activeBranchId: null,
    };
  }

  private readRefreshCookie(req: Request, actor: 'staff' | 'customer'): string {
    const token = req.cookies?.[refreshCookieName(actor)] as string | undefined;
    if (!token) {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Refresh token cookie is missing.',
      });
    }
    return token;
  }

  private async runUseCase<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          error.httpStatus,
        );
      }
      throw error;
    }
  }
}
