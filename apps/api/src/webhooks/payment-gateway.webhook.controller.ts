import { HandleOnlinePaymentCallbackUseCase, ApplicationError } from '@hivork/application';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

/** Public payment gateway webhooks — IFP-089. */
@Controller('v1/webhooks')
export class PaymentGatewayWebhookController {
  constructor(
    private readonly handleOnlinePaymentCallback: HandleOnlinePaymentCallbackUseCase,
  ) {}

  /** POST /api/v1/webhooks/payment-gateway/:provider */
  @Post('payment-gateway/:provider')
  @HttpCode(HttpStatus.OK)
  async receivePaymentGatewayWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    try {
      const result = await this.handleOnlinePaymentCallback.execute({
        provider,
        headers,
        body,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        ok: true,
        idempotentReplay: result.idempotentReplay,
        paymentAttemptId: result.paymentAttempt.id,
        status: result.paymentAttempt.status,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }

      throw error;
    }
  }
}
