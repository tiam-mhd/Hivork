import { ApplicationError } from '@hivork/application';
import { LocalFileStorageService } from '@hivork/infrastructure';
import {
  Controller,
  Get,
  HttpException,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

@Controller('v1/files')
export class SignedFileDownloadController {
  constructor(private readonly fileStorage: LocalFileStorageService) {}

  @Get('signed-download')
  async download(@Query('token') token: string | undefined, @Res() res: Response) {
    if (!token?.trim()) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', message: 'Download token is required.' },
        400,
      );
    }

    try {
      const payload = this.fileStorage.verifyToken(token.trim());
      const absolutePath = this.fileStorage.resolveAbsolutePath(payload.key);
      const fileStat = await stat(absolutePath);

      res.setHeader('Content-Length', String(fileStat.size));
      res.setHeader('Content-Disposition', 'attachment');
      createReadStream(absolutePath).pipe(res);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }
      throw new HttpException(
        { code: 'FILE_NOT_FOUND', message: 'File is no longer available.' },
        404,
      );
    }
  }
}
