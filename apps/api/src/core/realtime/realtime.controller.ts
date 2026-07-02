import {
  GetNotificationUnreadCountUseCase,
  MarkNotificationsReadUseCase,
  PublishRealtimeEventUseCase,
} from '@hivork/application';
import { NotificationUnreadCountSchema } from '@hivork/contracts/realtime';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Sse,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';

import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { RealtimeStreamService } from './realtime-stream.service.js';

@Controller('v1/realtime')
@RequireAuth('staff')
export class RealtimeController {
  constructor(private readonly streamService: RealtimeStreamService) {}

  @Get('stream')
  @Sse()
  stream(@CurrentStaff() staff: StaffContext): Observable<MessageEvent> {
    return this.streamService.subscribe(staff);
  }
}

@Controller('v1/notifications')
@RequireAuth('staff')
export class NotificationsController {
  constructor(
    private readonly getUnreadCount: GetNotificationUnreadCountUseCase,
    private readonly markRead: MarkNotificationsReadUseCase,
  ) {}

  @Get('unread-count')
  async unreadCount(@CurrentStaff() staff: StaffContext) {
    const result = await this.getUnreadCount.execute({
      tenantId: staff.tenantId,
      staffId: staff.id,
    });
    return NotificationUnreadCountSchema.parse(result);
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markNotificationsRead(@CurrentStaff() staff: StaffContext): Promise<void> {
    await this.markRead.execute({
      tenantId: staff.tenantId,
      staffId: staff.id,
    });
  }
}

@Controller('v1/dev/realtime')
@RequireAuth('staff')
export class RealtimeDevController {
  constructor(
    private readonly publishEvent: PublishRealtimeEventUseCase,
    private readonly config: AppConfigService,
  ) {}

  @Post('ping')
  @HttpCode(HttpStatus.NO_CONTENT)
  async ping(@CurrentStaff() staff: StaffContext): Promise<void> {
    if (this.config.nodeEnv === 'production') {
      throw new NotFoundException();
    }

    await this.publishEvent.execute({
      tenantId: staff.tenantId,
      staffId: staff.id,
      event: {
        id: randomUUID(),
        type: 'system.ping',
        priority: 'high',
        payload: { message: 'تست اعلان لحظه‌ای' },
        createdAt: new Date().toISOString(),
      },
    });
  }
}
