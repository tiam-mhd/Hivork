import {
  FILE_STORAGE_PORT,
  FILE_VIRUS_SCAN_PORT,
} from '@hivork/application';
import { LocalFileStorageService, NoopFileVirusScanPort } from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service.js';
import { SignedFileDownloadController } from './signed-file-download.controller.js';

@Module({
  controllers: [SignedFileDownloadController],
  providers: [
    NoopFileVirusScanPort,
    {
      provide: FILE_VIRUS_SCAN_PORT,
      useExisting: NoopFileVirusScanPort,
    },
    {
      provide: LocalFileStorageService,
      useFactory: (config: AppConfigService) =>
        new LocalFileStorageService({
          rootPath: config.fileStoragePath,
          signingSecret: config.fileStorageSigningSecret,
          publicApiBaseUrl: config.publicApiBaseUrl,
        }),
      inject: [AppConfigService],
    },
    {
      provide: FILE_STORAGE_PORT,
      useExisting: LocalFileStorageService,
    },
  ],
  exports: [FILE_STORAGE_PORT, FILE_VIRUS_SCAN_PORT, LocalFileStorageService],
})
export class FilesModule {}
