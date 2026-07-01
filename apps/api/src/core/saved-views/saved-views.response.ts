import type { StaffSavedViewRecord } from '@hivork/application';
import type { SavedViewItemDto } from '@hivork/contracts/core';

export function toSavedViewResponse(record: StaffSavedViewRecord): SavedViewItemDto {
  return {
    id: record.id,
    resourceKey: record.resourceKey as SavedViewItemDto['resourceKey'],
    name: record.name,
    description: record.description,
    columnState: record.columnState,
    sortBy: record.sortBy,
    sortDir: record.sortDir,
    search: record.search,
    savedFilterId: record.savedFilterId,
    filterAst: record.filterAst,
    isDefault: record.isDefault,
    visibility: record.visibility as SavedViewItemDto['visibility'],
    ownerName: record.ownerName,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
