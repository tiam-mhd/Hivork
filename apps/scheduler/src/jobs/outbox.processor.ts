import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { OutboxProcessorService } from '@hivork/infrastructure';
import { Job } from 'bullmq';

import { HIVORK_JOBS_QUEUE, OUTBOX_PROCESS_JOB } from '../config/env.schema';

@Processor(HIVORK_JOBS_QUEUE)
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(private readonly outboxProcessor: OutboxProcessorService) {
    super();
  }

  async process(job: Job): Promise<{ processed: number }> {
    if (job.name !== OUTBOX_PROCESS_JOB) {
      return { processed: 0 };
    }

    const processed = await this.outboxProcessor.processPendingBatch();
    if (processed > 0) {
      this.logger.log(`Processed ${processed} outbox event(s) jobId=${job.id}`);
    }

    return { processed };
  }
}
