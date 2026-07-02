'use client';

import type {
  AdjustCustomerScoreDto,
  BlacklistCustomerDto,
  CreateCustomerNoteInputDto,
  CustomerContractListResponseDto,
  CustomerNoteListResponseDto,
  CustomerPaymentListResponseDto,
  CustomerTimelineListResponseDto,
  MergeCustomersDto,
  MergeCustomersResponseDto,
  TenantCustomerDetailResponseDto,
  TransferCustomerOwnershipDto,
  UpdateCustomerNoteInputDto,
} from '@hivork/contracts/customers';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiFetch } from '@/lib/api/client';

export const customerQueryKeys = {
  all: ['customers'] as const,
  detail: (id: string, include?: string) => ['customers', id, 'detail', include ?? ''] as const,
  timeline: (id: string) => ['customers', id, 'timeline'] as const,
  payments: (id: string) => ['customers', id, 'payments'] as const,
  contracts: (id: string) => ['customers', id, 'contracts'] as const,
  notes: (id: string) => ['customers', id, 'notes'] as const,
  staff: (id: string) => ['staff', id] as const,
};

type CursorPageMeta = {
  hasNext: boolean;
  nextCursor: string | null;
};

function buildCursorQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchCustomerDetail(
  customerId: string,
  include?: string[],
): Promise<TenantCustomerDetailResponseDto> {
  const params = include?.length ? `?include=${include.join(',')}` : '';
  return apiFetch<TenantCustomerDetailResponseDto>(`/customers/${customerId}${params}`);
}

export async function fetchCustomerTimeline(
  customerId: string,
  cursor?: string,
  limit = 20,
): Promise<CustomerTimelineListResponseDto> {
  return apiFetch<CustomerTimelineListResponseDto>(
    `/customers/${customerId}/timeline${buildCursorQuery({ cursor, limit: String(limit) })}`,
  );
}

export async function fetchCustomerPayments(
  customerId: string,
  cursor?: string,
  limit = 20,
): Promise<CustomerPaymentListResponseDto> {
  return apiFetch<CustomerPaymentListResponseDto>(
    `/customers/${customerId}/payments${buildCursorQuery({ cursor, limit: String(limit) })}`,
  );
}

export async function fetchCustomerContracts(
  customerId: string,
  cursor?: string,
  limit = 20,
): Promise<CustomerContractListResponseDto> {
  return apiFetch<CustomerContractListResponseDto>(
    `/customers/${customerId}/contracts${buildCursorQuery({ cursor, limit: String(limit) })}`,
  );
}

export async function fetchCustomerNotes(
  customerId: string,
  cursor?: string,
  limit = 20,
): Promise<CustomerNoteListResponseDto> {
  return apiFetch<CustomerNoteListResponseDto>(
    `/customers/${customerId}/notes${buildCursorQuery({ cursor, limit: String(limit) })}`,
  );
}

export async function archiveCustomer(customerId: string): Promise<void> {
  await apiFetch(`/customers/${customerId}/archive`, { method: 'POST', body: JSON.stringify({}) });
}

export async function unarchiveCustomer(customerId: string): Promise<void> {
  await apiFetch(`/customers/${customerId}/unarchive`, { method: 'POST', body: JSON.stringify({}) });
}

export async function deleteCustomer(customerId: string, deleteReason?: string): Promise<void> {
  await apiFetch(`/customers/${customerId}`, {
    method: 'DELETE',
    body: JSON.stringify(deleteReason ? { deleteReason } : {}),
  });
}

export async function restoreCustomer(customerId: string): Promise<void> {
  await apiFetch(`/customers/${customerId}/restore`, { method: 'POST', body: JSON.stringify({}) });
}

export async function blacklistCustomer(
  customerId: string,
  body: BlacklistCustomerDto,
): Promise<TenantCustomerDetailResponseDto> {
  return apiFetch<TenantCustomerDetailResponseDto>(`/customers/${customerId}/blacklist`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function unblacklistCustomer(
  customerId: string,
): Promise<TenantCustomerDetailResponseDto> {
  return apiFetch<TenantCustomerDetailResponseDto>(`/customers/${customerId}/unblacklist`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function adjustCustomerScore(
  customerId: string,
  body: AdjustCustomerScoreDto,
): Promise<TenantCustomerDetailResponseDto> {
  return apiFetch<TenantCustomerDetailResponseDto>(`/customers/${customerId}/score`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function transferCustomerOwnership(
  customerId: string,
  body: TransferCustomerOwnershipDto,
): Promise<TenantCustomerDetailResponseDto> {
  return apiFetch<TenantCustomerDetailResponseDto>(`/customers/${customerId}/transfer-ownership`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function mergeCustomers(
  body: MergeCustomersDto,
  idempotencyKey: string,
): Promise<MergeCustomersResponseDto> {
  return apiFetch<MergeCustomersResponseDto>('/customers/merge', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  });
}

export async function createCustomerNote(
  customerId: string,
  body: CreateCustomerNoteInputDto,
): Promise<{ data: unknown }> {
  return apiFetch(`/customers/${customerId}/notes`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateCustomerNote(
  customerId: string,
  noteId: string,
  body: UpdateCustomerNoteInputDto,
): Promise<{ data: unknown }> {
  return apiFetch(`/customers/${customerId}/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteCustomerNote(
  customerId: string,
  noteId: string,
  deleteReason?: string,
): Promise<void> {
  await apiFetch(`/customers/${customerId}/notes/${noteId}`, {
    method: 'DELETE',
    body: JSON.stringify(deleteReason ? { deleteReason } : {}),
  });
}

export function useCustomerDetail(
  customerId: string,
  options?: { include?: string[]; enabled?: boolean },
): UseQueryResult<TenantCustomerDetailResponseDto, Error> {
  const includeKey = options?.include?.join(',') ?? 'salesSummary';
  return useQuery({
    queryKey: customerQueryKeys.detail(customerId, includeKey),
    queryFn: () => fetchCustomerDetail(customerId, options?.include ?? ['salesSummary']),
    enabled: Boolean(customerId) && (options?.enabled ?? true),
  });
}

export function useAssignedStaffName(staffId: string | null | undefined) {
  return useQuery({
    queryKey: customerQueryKeys.staff(staffId ?? ''),
    queryFn: async () => {
      if (!staffId) {
        return null;
      }
      const staff = await apiFetch<{ name: string }>(`/staff/${staffId}`);
      return staff.name;
    },
    enabled: Boolean(staffId),
    staleTime: 60_000,
  });
}

function useCustomerCursorList<TItem>(
  queryKey: readonly unknown[],
  fetchPage: (cursor?: string) => Promise<{ items: TItem[]; meta: CursorPageMeta }>,
  enabled: boolean,
) {
  const query = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext && lastPage.meta.nextCursor ? lastPage.meta.nextCursor : undefined,
  });

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  const fetchNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage,
    refetch: query.refetch,
  };
}

export function useCustomerTimeline(customerId: string, enabled: boolean) {
  return useCustomerCursorList(
    [...customerQueryKeys.timeline(customerId)],
    async (cursor) => {
      const response = await fetchCustomerTimeline(customerId, cursor);
      return { items: response.items, meta: response.meta };
    },
    enabled && Boolean(customerId),
  );
}

export function useCustomerPayments(customerId: string, enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: customerQueryKeys.payments(customerId),
    enabled: enabled && Boolean(customerId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchCustomerPayments(customerId, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext && lastPage.meta.nextCursor ? lastPage.meta.nextCursor : undefined,
  });

  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  const summary = query.data?.pages[0]?.summary;

  const fetchNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return {
    items,
    summary,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage,
    refetch: query.refetch,
  };
}

export function useCustomerContracts(customerId: string, enabled: boolean) {
  return useCustomerCursorList(
    [...customerQueryKeys.contracts(customerId)],
    async (cursor) => {
      const response = await fetchCustomerContracts(customerId, cursor);
      return { items: response.data, meta: response.meta };
    },
    enabled && Boolean(customerId),
  );
}

export function useCustomerNotes(customerId: string, enabled: boolean) {
  return useCustomerCursorList(
    [...customerQueryKeys.notes(customerId)],
    async (cursor) => {
      const response = await fetchCustomerNotes(customerId, cursor);
      return { items: response.data, meta: response.meta };
    },
    enabled && Boolean(customerId),
  );
}

export function useInvalidateCustomerQueries() {
  const queryClient = useQueryClient();

  return useCallback(
    (customerId?: string) => {
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      if (customerId) {
        void queryClient.invalidateQueries({ queryKey: ['customers', customerId] });
      }
    },
    [queryClient],
  );
}

export type CustomerMutations = {
  archive: UseMutationResult<void, Error, void>;
  unarchive: UseMutationResult<void, Error, void>;
  deleteCustomer: UseMutationResult<void, Error, string | undefined>;
  blacklist: UseMutationResult<TenantCustomerDetailResponseDto, Error, BlacklistCustomerDto>;
  unblacklist: UseMutationResult<TenantCustomerDetailResponseDto, Error, void>;
  transfer: UseMutationResult<
    TenantCustomerDetailResponseDto,
    Error,
    TransferCustomerOwnershipDto
  >;
  merge: UseMutationResult<
    MergeCustomersResponseDto,
    Error,
    { body: MergeCustomersDto; idempotencyKey: string }
  >;
};

export function useCustomerMutations(customerId: string): CustomerMutations {
  const invalidate = useInvalidateCustomerQueries();

  const onDetailChanged = useCallback(
    (id: string) => {
      invalidate(id);
    },
    [invalidate],
  );

  return {
    archive: useMutation({
      mutationFn: () => archiveCustomer(customerId),
      onSuccess: () => onDetailChanged(customerId),
    }),
    unarchive: useMutation({
      mutationFn: () => unarchiveCustomer(customerId),
      onSuccess: () => onDetailChanged(customerId),
    }),
    deleteCustomer: useMutation({
      mutationFn: (deleteReason?: string) => deleteCustomer(customerId, deleteReason),
      onSuccess: () => invalidate(),
    }),
    blacklist: useMutation({
      mutationFn: (body: BlacklistCustomerDto) => blacklistCustomer(customerId, body),
      onSuccess: () => onDetailChanged(customerId),
    }),
    unblacklist: useMutation({
      mutationFn: () => unblacklistCustomer(customerId),
      onSuccess: () => onDetailChanged(customerId),
    }),
    transfer: useMutation({
      mutationFn: (body: TransferCustomerOwnershipDto) =>
        transferCustomerOwnership(customerId, body),
      onSuccess: () => onDetailChanged(customerId),
    }),
    merge: useMutation({
      mutationFn: ({ body, idempotencyKey }: { body: MergeCustomersDto; idempotencyKey: string }) =>
        mergeCustomers(body, idempotencyKey),
      onSuccess: () => invalidate(),
    }),
  };
}
