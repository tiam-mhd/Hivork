import {
  GetNotificationUnreadCountUseCase,
  MarkNotificationsReadUseCase,
  PublishRealtimeEventUseCase,
} from '@hivork/application';
import {
  PrismaModule,
  PrismaTenantRepository,
  RedisRealtimeConnectionRegistry,
  RedisRealtimePublisher,
  RedisRealtimeUnreadCounter,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module.js';
import {
  NotificationsController,
  RealtimeController,
  RealtimeDevController,
} from './realtime.controller.js';
import { RealtimeStreamService } from './realtime-stream.service.js';
import { RealtimeWsService } from './realtime-ws.service.js';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [RealtimeController, NotificationsController, RealtimeDevController],
  providers: [
    PrismaTenantRepository,
    RedisRealtimePublisher,
    RedisRealtimeConnectionRegistry,
    RedisRealtimeUnreadCounter,
    RealtimeStreamService,
    RealtimeWsService,
    {
      provide: PublishRealtimeEventUseCase,
      useFactory: (
        publisher: RedisRealtimePublisher,
        unread: RedisRealtimeUnreadCounter,
      ) => new PublishRealtimeEventUseCase(publisher, unread),
      inject: [RedisRealtimePublisher, RedisRealtimeUnreadCounter],
    },
    {
      provide: GetNotificationUnreadCountUseCase,
      useFactory: (unread: RedisRealtimeUnreadCounter) =>
        new GetNotificationUnreadCountUseCase(unread),
      inject: [RedisRealtimeUnreadCounter],
    },
    {
      provide: MarkNotificationsReadUseCase,
      useFactory: (unread: RedisRealtimeUnreadCounter) =>
        new MarkNotificationsReadUseCase(unread),
      inject: [RedisRealtimeUnreadCounter],
    },
  ],
  exports: [RedisRealtimePublisher, PublishRealtimeEventUseCase],
})
export class RealtimeModule {}
