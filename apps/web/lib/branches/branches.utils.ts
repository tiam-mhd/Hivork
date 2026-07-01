export const BRANCH_LIST_LIMIT = 50;
export const BRANCH_LIST_SORT = 'name:asc' as const;

export const BRANCH_VIEW_PERMISSION = 'core.branch.view';
export const BRANCH_CREATE_PERMISSION = 'core.branch.create';
export const BRANCH_UPDATE_PERMISSION = 'core.branch.update';
export const BRANCH_DELETE_PERMISSION = 'core.branch.delete';

export function buildBranchesQueryString(cursor?: string): string {
  const params = new URLSearchParams();
  params.set('limit', String(BRANCH_LIST_LIMIT));
  params.set('sort', BRANCH_LIST_SORT);
  if (cursor) {
    params.set('cursor', cursor);
  }
  return `?${params.toString()}`;
}

export function mapBranchDeleteError(code: string, details?: Record<string, unknown>): string {
  if (code === 'BRANCH_IS_DEFAULT') {
    return 'شعبه پیش‌فرض قابل حذف نیست.';
  }

  if (code === 'DELETE_FORBIDDEN') {
    if (details?.reason === 'active_sales') {
      return 'این شعبه فروش فعال دارد و قابل حذف نیست.';
    }
    return 'حداقل یک شعبه باید باقی بماند.';
  }

  if (code === 'VALIDATION_ERROR') {
    return 'نام شعبه تکراری است.';
  }

  return 'حذف شعبه ناموفق بود.';
}

export function filterBranchesBySearch<T extends { name: string; address: string | null; phone: string | null }>(
  items: T[],
  search: string,
): T[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [item.name, item.address ?? '', item.phone ?? ''].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}
