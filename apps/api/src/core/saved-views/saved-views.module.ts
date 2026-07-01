import {
  AUDIT_SERVICE,
  CreateStaffSavedViewUseCase,
  ForkSharedSavedViewUseCase,
  ListStaffSavedViewsUseCase,
  RestoreStaffSavedViewUseCase,
  SoftDeleteStaffSavedViewUseCase,
  UpdateStaffSavedViewUseCase,
  type AuditService,
} from '@hivork/application';
import {
  PrismaModule,
  PrismaStaffSavedFilterRepository,
  PrismaStaffSavedViewRepository,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module.js';
import { SavedViewsController } from './saved-views.controller.js';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [SavedViewsController],
  providers: [
    PrismaStaffSavedViewRepository,
    PrismaStaffSavedFilterRepository,
    {
      provide: ListStaffSavedViewsUseCase,
      useFactory: (repository: PrismaStaffSavedViewRepository) =>
        new ListStaffSavedViewsUseCase(repository),
      inject: [PrismaStaffSavedViewRepository],
    },
    {
      provide: CreateStaffSavedViewUseCase,
      useFactory: (
        repository: PrismaStaffSavedViewRepository,
        savedFilters: PrismaStaffSavedFilterRepository,
        audit: AuditService,
      ) => new CreateStaffSavedViewUseCase(repository, savedFilters, audit),
      inject: [PrismaStaffSavedViewRepository, PrismaStaffSavedFilterRepository, AUDIT_SERVICE],
    },
    {
      provide: UpdateStaffSavedViewUseCase,
      useFactory: (
        repository: PrismaStaffSavedViewRepository,
        savedFilters: PrismaStaffSavedFilterRepository,
        audit: AuditService,
      ) => new UpdateStaffSavedViewUseCase(repository, savedFilters, audit),
      inject: [PrismaStaffSavedViewRepository, PrismaStaffSavedFilterRepository, AUDIT_SERVICE],
    },
    {
      provide: SoftDeleteStaffSavedViewUseCase,
      useFactory: (repository: PrismaStaffSavedViewRepository, audit: AuditService) =>
        new SoftDeleteStaffSavedViewUseCase(repository, audit),
      inject: [PrismaStaffSavedViewRepository, AUDIT_SERVICE],
    },
    {
      provide: RestoreStaffSavedViewUseCase,
      useFactory: (repository: PrismaStaffSavedViewRepository, audit: AuditService) =>
        new RestoreStaffSavedViewUseCase(repository, audit),
      inject: [PrismaStaffSavedViewRepository, AUDIT_SERVICE],
    },
    {
      provide: ForkSharedSavedViewUseCase,
      useFactory: (
        repository: PrismaStaffSavedViewRepository,
        savedFilters: PrismaStaffSavedFilterRepository,
        audit: AuditService,
      ) => new ForkSharedSavedViewUseCase(repository, savedFilters, audit),
      inject: [PrismaStaffSavedViewRepository, PrismaStaffSavedFilterRepository, AUDIT_SERVICE],
    },
  ],
})
export class SavedViewsModule {}
