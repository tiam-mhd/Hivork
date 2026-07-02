import type { FileVirusScanInput, IFileVirusScanPort } from '@hivork/application';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NoopFileVirusScanPort implements IFileVirusScanPort {
  async enqueueScan(_input: FileVirusScanInput): Promise<void> {
    // IFP-043 — placeholder for async scan worker (Epic-04 policy)
  }
}
