import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { HEALTH_CHECK_JOB, HIVORK_JOBS_QUEUE, OUTBOX_PROCESS_JOB, STAFF_SESSION_EXPIRE_JOB } from '../config/env.schema';

@Injectable()
export class StartupJobsService implements OnModuleInit {
  private readonly logger = new Logger(StartupJobsService.name);

  constructor(@InjectQueue(HIVORK_JOBS_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    const healthJob = await this.queue.add(
      HEALTH_CHECK_JOB,
      {},
      {
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
    this.logger.log(`Enqueued ${HEALTH_CHECK_JOB} jobId=${healthJob.id}`);

    const outboxJob = await this.queue.add(
      OUTBOX_PROCESS_JOB,
      {},
      {
        repeat: { every: 10_000 },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
    this.logger.log(`Scheduled ${OUTBOX_PROCESS_JOB} jobId=${outboxJob.id} every 10s`);

    const expireJob = await this.queue.add(
      STAFF_SESSION_EXPIRE_JOB,
      {},
      {
        repeat: { every: 3_600_000 },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
    this.logger.log(`Scheduled ${STAFF_SESSION_EXPIRE_JOB} jobId=${expireJob.id} every 1h`);
  }
}
