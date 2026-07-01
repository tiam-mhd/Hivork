import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { HEALTH_CHECK_JOB, HIVORK_JOBS_QUEUE } from '../config/env.schema';

@Processor(HIVORK_JOBS_QUEUE)
export class HealthCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(HealthCheckProcessor.name);

  async process(job: Job): Promise<{ ok: true; at: string }> {
    if (job.name !== HEALTH_CHECK_JOB) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return { ok: true, at: new Date().toISOString() };
    }

    const result = { ok: true as const, at: new Date().toISOString() };
    this.logger.log(`health-check processed jobId=${job.id} at=${result.at}`);
    return result;
  }
}
