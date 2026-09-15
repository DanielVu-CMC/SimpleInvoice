export function money(value: string, currency: string) {
  const [whole, fraction = '00'] = value.split('.');
  // Format the integer as BigInt and retain the server's exact cents.
  // This is display formatting only; invoice arithmetic belongs to the API.
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .formatToParts(whole === '-0' ? -0 : BigInt(whole))
    .map((part) =>
      part.type === 'fraction' ? fraction.padEnd(2, '0') : part.value,
    )
    .join('');
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value + 'T00:00:00Z'));
}
export const today = () => new Date().toISOString().slice(0, 10);
