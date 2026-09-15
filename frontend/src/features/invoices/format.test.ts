import { describe, it, expect } from 'vitest';
import { money, dateLabel } from './format';
describe('Display formatting', () => {
  it('formats server decimal strings without rounding away digits', () =>
    expect(money('999999999999990000.00', 'AUD')).toBe(
      'AUD\u00a0999,999,999,999,990,000.00',
    ));
  it('preserves cents at large magnitudes', () =>
    expect(money('999999999999990000.29', 'AUD')).toBe(
      'AUD\u00a0999,999,999,999,990,000.29',
    ));
  it('preserves negative sub-unit balances', () =>
    expect(money('-0.05', 'USD')).toBe('-USD\u00a00.05'));
  it('formats date-only values in UTC', () =>
    expect(dateLabel('2026-06-03')).toBe('03 Jun 2026'));
});
