import { describe, expect, it } from 'vitest';

import {
  buildOverdueReportQueryString,
  DEFAULT_OVERDUE_REPORT_SORT,
  type OverdueReportFiltersState,
} from './overdue-report.utils';

const baseFilters: OverdueReportFiltersState = {
  branchId: 'branch-1',
  overdueDaysMin: '',
  overdueDaysMax: '',
  search: '',
  minAmountRial: '',
  sort: DEFAULT_OVERDUE_REPORT_SORT,
  limit: 20,
};

describe('buildOverdueReportQueryString', () => {
  it('omits default sort from query string', () => {
    const query = buildOverdueReportQueryString(baseFilters);
    expect(query).toBe('?branchId=branch-1');
    expect(query).not.toContain('sort=');
  });

  it('includes sort param when not default', () => {
    const query = buildOverdueReportQueryString({
      ...baseFilters,
      sort: 'overdueDays:desc',
    });
    expect(query).toContain('sort=overdueDays%3Adesc');
  });

  it('includes min amount and search filters', () => {
    const query = buildOverdueReportQueryString({
      ...baseFilters,
      search: 'علی',
      minAmountRial: '5000000',
      overdueDaysMin: '7',
      overdueDaysMax: '30',
    });
    expect(query).toContain('search=');
    expect(query).toContain('minAmountRial=5000000');
    expect(query).toContain('overdueDaysMin=7');
    expect(query).toContain('overdueDaysMax=30');
  });
});
