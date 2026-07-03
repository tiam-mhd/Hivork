import {
  HandleOnlinePaymentCallbackUseCase,
  PAYMENT_GATEWAY_REGISTRY,
  type IPaymentGatewayRegistry,
} from '@hivork/application';
import {
  MockPaymentGateway,
  MockPaymentGatewayRegistry,
  PrismaAuditService,
  PrismaModule,
  PrismaOutboxPublisher,
  PrismaPaymentAttemptRepository,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AppConfigModule } from '../config/app-config.module.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PaymentGatewayWebhookController } from './payment-gateway.webhook.controller.js';

@Module({
  imports: [PrismaModule, AppConfigModule],
  controllers: [PaymentGatewayWebhookController],
  providers: [
    PrismaPaymentAttemptRepository,
    PrismaUnitOfWork,
    PrismaTenantSettingsRepository,
    PrismaAuditService,
    PrismaOutboxPublisher,
    {
      provide: MockPaymentGateway,
      useFactory: (config: AppConfigService) =>
        new MockPaymentGateway({
          webhookSecret: config.paymentGatewayWebhookSecret,
          publicApiBaseUrl: config.publicApiBaseUrl,
          nodeEnv: config.nodeEnv,
        }),
      inject: [AppConfigService],
    },
    {
      provide: PAYMENT_GATEWAY_REGISTRY,
      useFactory: (mockGateway: MockPaymentGateway) =>
        new MockPaymentGatewayRegistry(new Map([[mockGateway.provider, mockGateway]])),
      inject: [MockPaymentGateway],
    },
    {
      provide: HandleOnlinePaymentCallbackUseCase,
      useFactory: (
        unitOfWork: PrismaUnitOfWork,
        paymentAttempts: PrismaPaymentAttemptRepository,
        tenantSettings: PrismaTenantSettingsRepository,
        gateways: IPaymentGatewayRegistry,
        audit: PrismaAuditService,
        outbox: PrismaOutboxPublisher,
      ) =>
        new HandleOnlinePaymentCallbackUseCase(
          unitOfWork,
          paymentAttempts,
          tenantSettings,
          gateways,
          audit,
          outbox,
        ),
      inject: [
        PrismaUnitOfWork,
        PrismaPaymentAttemptRepository,
        PrismaTenantSettingsRepository,
        PAYMENT_GATEWAY_REGISTRY,
        PrismaAuditService,
        PrismaOutboxPublisher,
      ],
    },
  ],
})
export class WebhooksModule {}
