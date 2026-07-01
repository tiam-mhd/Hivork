import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ExpireStaffSessionsService } from '@hivork/infrastructure';
import { Job } from 'bullmq';

import { HIVORK_JOBS_QUEUE, STAFF_SESSION_EXPIRE_JOB } from '../config/env.schema';

@Processor(HIVORK_JOBS_QUEUE)
export class StaffSessionExpireProcessor extends WorkerHost {
  private readonly logger = new Logger(StaffSessionExpireProcessor.name);

  constructor(private readonly expireStaffSessions: ExpireStaffSessionsService) {
    super();
  }

  async process(job: Job): Promise<{ expired: number }> {
    if (job.name !== STAFF_SESSION_EXPIRE_JOB) {
      return { expired: 0 };
    }

    const expired = await this.expireStaffSessions.run();
    if (expired > 0) {
      this.logger.log(`Marked ${expired} staff session(s) expired jobId=${job.id}`);
    }

    return { expired };
  }
}
