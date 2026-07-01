export function maskIpForDisplay(ip: string): string {
  if (ip.includes(':')) {
    const segments = ip.split(':').filter(Boolean);
    if (segments.length >= 2) {
      return `${segments[0]}:${segments[1]}:…`;
    }
    return `${ip.slice(0, 8)}…`;
  }

  const octets = ip.split('.');
  if (octets.length === 4) {
    return `${octets[0]}.${octets[1]}.*.*`;
  }

  return ip;
}
