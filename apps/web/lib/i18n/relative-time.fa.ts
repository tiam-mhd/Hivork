export function formatRelativeTimeFa(isoDate: string, now = Date.now()): string {
  const then = Date.parse(isoDate);
  if (Number.isNaN(then)) {
    return isoDate;
  }

  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return 'همین الان';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} دقیقه پیش`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour} ساعت پیش`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) {
    return `${diffDay} روز پیش`;
  }

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    return `${diffMonth} ماه پیش`;
  }

  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear} سال پیش`;
}
