import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxProcessorService, PrismaModule, ExpireStaffSessionsService, PrismaStaffSessionRepository } from '@hivork/infrastructure';

import { HealthCheckProcessor } from './health-check.processor';
import { OutboxProcessor } from './outbox.processor';
import { StaffSessionExpireProcessor } from './staff-session-expire.processor';
import { StartupJobsService } from './startup-jobs.service';
import { EnvConfig, HIVORK_JOBS_QUEUE } from '../config/env.schema';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: HIVORK_JOBS_QUEUE,
    }),
  ],
  providers: [
    HealthCheckProcessor,
    OutboxProcessor,
    StaffSessionExpireProcessor,
    OutboxProcessorService,
    PrismaStaffSessionRepository,
    ExpireStaffSessionsService,
    StartupJobsService,
  ],
  exports: [BullModule],
})
export class JobsQueueModule {}

export function createBullRootModule() {
  return BullModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService<EnvConfig, true>) => ({
      connection: {
        url: config.get('REDIS_URL', { infer: true }),
      },
    }),
  });
}
