import type { StaffSavedFilterRecord } from '@hivork/application';
import type { SavedFilterItemDto } from '@hivork/contracts/core';

export function toSavedFilterResponse(record: StaffSavedFilterRecord): SavedFilterItemDto {
  return {
    id: record.id,
    resourceKey: record.resourceKey as SavedFilterItemDto['resourceKey'],
    name: record.name,
    description: record.description,
    filterAst: record.filterAst,
    isDefault: record.isDefault,
    visibility: record.visibility as SavedFilterItemDto['visibility'],
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
