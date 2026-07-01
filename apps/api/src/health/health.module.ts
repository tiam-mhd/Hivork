import { Module } from '@nestjs/common';

import { HealthRootController, HealthV1Controller } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthRootController, HealthV1Controller],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
