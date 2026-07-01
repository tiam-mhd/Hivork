import { ApplicationError, type IPermissionRegistry } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaPermissionRegistry implements IPermissionRegistry {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePermissionIds(codes: string[]): Promise<Map<string, string>> {
    if (codes.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.permission.findMany({
      where: {
        code: { in: codes },
        deletedAt: null,
      },
      select: { id: true, code: true },
    });

    const resolved = new Map(rows.map((row) => [row.code, row.id]));
    const missing = codes.filter((code) => !resolved.has(code));

    if (missing.length > 0) {
      throw new ApplicationError('PERMISSION_NOT_FOUND', 'One or more permissions were not found.', 404, {
        permissions: missing,
      });
    }

    return resolved;
  }
}
