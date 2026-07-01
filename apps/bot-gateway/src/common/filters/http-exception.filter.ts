import { ApplicationError, mapDomainError } from '@hivork/application';
import { ErrorCodes, type ApiError } from '@hivork/contracts';
import { DomainError } from '@hivork/domain';
import { HardDeleteForbiddenError } from '@hivork/infrastructure';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.mapException(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { path: request.url, method: request.method, code: body.code },
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private mapException(exception: unknown): { status: number; body: ApiError } {
    if (exception instanceof HttpException) {
      return this.mapHttpException(exception);
    }

    if (exception instanceof ApplicationError) {
      return {
        status: exception.httpStatus,
        body: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      };
    }

    if (exception instanceof DomainError) {
      const mapped = mapDomainError(exception);
      return {
        status: mapped.httpStatus,
        body: {
          code: mapped.code,
          message: mapped.message,
          details: mapped.details,
        },
      };
    }

    if (exception instanceof HardDeleteForbiddenError) {
      return {
        status: HttpStatus.FORBIDDEN,
        body: {
          code: ErrorCodes.HARD_DELETE_FORBIDDEN,
          message: exception.message,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Internal server error',
      },
    };
  }

  private mapHttpException(exception: HttpException): { status: number; body: ApiError } {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const responseObject =
      typeof response === 'object' && response !== null
        ? (response as Record<string, unknown>)
        : undefined;

    const code =
      typeof responseObject?.code === 'string'
        ? responseObject.code
        : this.codeFromStatus(status);

    const details =
      responseObject?.details &&
      typeof responseObject.details === 'object' &&
      !Array.isArray(responseObject.details)
        ? (responseObject.details as Record<string, unknown>)
        : undefined;

    return {
      status,
      body: {
        code,
        message: this.messageFromResponse(response, exception.message),
        details,
      },
    };
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCodes.OTP_RATE_LIMITED;
      default:
        return ErrorCodes.INTERNAL_ERROR;
    }
  }

  private messageFromResponse(response: string | object, fallback: string): string {
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return message.join('; ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }
    return fallback;
  }
}
