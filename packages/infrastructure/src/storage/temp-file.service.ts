import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';

@Injectable()
export class TempFileService {
  async withTempFile<T>(
    buffer: Buffer,
    extension: string,
    handler: (filePath: string) => Promise<T>,
  ): Promise<T> {
    const filePath = join(tmpdir(), `hivork-${randomUUID()}.${extension}`);

    await writeFile(filePath, buffer);

    try {
      return await handler(filePath);
    } finally {
      await unlink(filePath).catch(() => undefined);
    }
  }
}
