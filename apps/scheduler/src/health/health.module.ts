import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { JobsQueueModule } from '../jobs/queue.module';

@Module({
  imports: [JobsQueueModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
