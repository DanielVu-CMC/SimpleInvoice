import { describe, expect, it } from 'vitest';
import { parseListQuery, serializeListQuery } from './list-query';
describe('Untrusted invoice list URLs', () => {
  it('round trips all supported list controls', () => {
    const url = new URLSearchParams(
      'page=3&pageSize=5&keyword=Paul&status=Overdue&sortBy=totalAmount&ordering=ASC&fromDate=2026-01-01&toDate=2026-12-31',
    );
    expect(parseListQuery(serializeListQuery(parseListQuery(url)))).toEqual({
      page: 3,
      pageSize: 5,
      keyword: 'Paul',
      status: 'Overdue',
      sortBy: 'totalAmount',
      ordering: 'ASC',
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
    });
  });
  it('normalizes malformed values and removes unrelated query keys', () => {
    const query = parseListQuery(
      new URLSearchParams(
        'page=NaN&pageSize=999&sortBy=passwordHash&ordering=nope&status=unknown&fromDate=2026-02-30&toDate=2026-13-01&extra=secret',
      ),
    );
    expect(query).toMatchObject({
      page: 1,
      pageSize: 10,
      sortBy: 'invoiceDate',
      ordering: 'DESC',
    });
    expect(query.status).toBeUndefined();
    expect(query.fromDate).toBeUndefined();
    expect(query.toDate).toBeUndefined();
    expect(serializeListQuery(query).has('extra')).toBe(false);
  });
  it.each(['-1', '0', '1.5', '1000001', 'Infinity', '1e2'])(
    'rejects invalid page %s',
    (page) => {
      expect(parseListQuery(new URLSearchParams({ page })).page).toBe(1);
    },
  );
  it('retains real but inverted dates so the UI can explain the error', () => {
    expect(
      parseListQuery(
        new URLSearchParams('fromDate=2026-09-20&toDate=2026-09-10'),
      ),
    ).toMatchObject({ fromDate: '2026-09-20', toDate: '2026-09-10' });
  });
  it('trims and limits keywords to the API limit', () => {
    expect(
      parseListQuery(
        new URLSearchParams({ keyword: '  ' + 'x'.repeat(201) + '  ' }),
      ).keyword,
    ).toHaveLength(200);
  });
});
