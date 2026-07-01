import {
  AUDIT_SERVICE,
  CreateStaffSavedFilterUseCase,
  ListStaffSavedFiltersUseCase,
  RestoreStaffSavedFilterUseCase,
  SoftDeleteStaffSavedFilterUseCase,
  UpdateStaffSavedFilterUseCase,
  type AuditService,
} from '@hivork/application';
import { PrismaModule, PrismaStaffSavedFilterRepository } from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module';
import { SavedFiltersController } from './saved-filters.controller.js';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [SavedFiltersController],
  providers: [
    PrismaStaffSavedFilterRepository,
    {
      provide: ListStaffSavedFiltersUseCase,
      useFactory: (repository: PrismaStaffSavedFilterRepository) =>
        new ListStaffSavedFiltersUseCase(repository),
      inject: [PrismaStaffSavedFilterRepository],
    },
    {
      provide: CreateStaffSavedFilterUseCase,
      useFactory: (repository: PrismaStaffSavedFilterRepository, audit: AuditService) =>
        new CreateStaffSavedFilterUseCase(repository, audit),
      inject: [PrismaStaffSavedFilterRepository, AUDIT_SERVICE],
    },
    {
      provide: UpdateStaffSavedFilterUseCase,
      useFactory: (repository: PrismaStaffSavedFilterRepository, audit: AuditService) =>
        new UpdateStaffSavedFilterUseCase(repository, audit),
      inject: [PrismaStaffSavedFilterRepository, AUDIT_SERVICE],
    },
    {
      provide: SoftDeleteStaffSavedFilterUseCase,
      useFactory: (repository: PrismaStaffSavedFilterRepository, audit: AuditService) =>
        new SoftDeleteStaffSavedFilterUseCase(repository, audit),
      inject: [PrismaStaffSavedFilterRepository, AUDIT_SERVICE],
    },
    {
      provide: RestoreStaffSavedFilterUseCase,
      useFactory: (repository: PrismaStaffSavedFilterRepository, audit: AuditService) =>
        new RestoreStaffSavedFilterUseCase(repository, audit),
      inject: [PrismaStaffSavedFilterRepository, AUDIT_SERVICE],
    },
  ],
})
export class SavedFiltersModule {}
