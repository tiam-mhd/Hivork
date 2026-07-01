import { applyDecorators, SetMetadata } from '@nestjs/common';

import { AUDITABLE_METADATA_KEY } from '../constants/auth.constants.js';

export const Auditable = (action: string) => SetMetadata(AUDITABLE_METADATA_KEY, action);

export const AuditableAction = (action: string, entityType: string) =>
  applyDecorators(
    SetMetadata(AUDITABLE_METADATA_KEY, action),
    SetMetadata('auditableEntityType', entityType),
  );
