import type { TenantCustomerListItemDto, TenantCustomerListResponseDto } from '@hivork/contracts/customers';

export function appendCustomersPage(
  currentItems: TenantCustomerListItemDto[],
  nextPage: TenantCustomerListResponseDto,
): {
  items: TenantCustomerListItemDto[];
  hasNext: boolean;
  nextCursor: string | null;
  total: number | undefined;
} {
  return {
    items: [...currentItems, ...nextPage.data],
    hasNext: nextPage.meta.hasNext,
    nextCursor: nextPage.meta.nextCursor,
    total: nextPage.meta.total,
  };
}

export function parseTagsParam(value: string | null): string[] {
  if (!value?.trim()) {
    return [];
  }
  return [
    ...new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

export function serializeTagsParam(tags: string[]): string {
  return tags.join(',');
}
