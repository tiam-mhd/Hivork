import ipaddr from 'ipaddr.js';

export function normalizeIpv4CidrEntry(entry: string): string {
  const trimmed = entry.trim();
  return trimmed.includes('/') ? trimmed : `${trimmed}/32`;
}

function parseIpv4Cidr(entry: string): [ipaddr.IPv4, number] {
  const [network, prefix] = ipaddr.parseCIDR(normalizeIpv4CidrEntry(entry));
  if (network.kind() !== 'ipv4') {
    throw new Error('IPv6 CIDR is not supported in v1');
  }
  return [network as ipaddr.IPv4, prefix];
}

/**
 * Returns true when client IP matches any allowlist entry.
 * Fail-safe: empty cidrs → deny all (caller must skip when allowlist disabled).
 * v1: IPv4 only.
 */
export function isClientIpAllowed(
  clientIp: string | undefined,
  cidrs: readonly string[],
): boolean {
  if (cidrs.length === 0) {
    return false;
  }

  if (!clientIp) {
    return false;
  }

  try {
    const parsed = ipaddr.parse(clientIp);
    if (parsed.kind() !== 'ipv4') {
      return false;
    }

    return cidrs.some((entry) => {
      try {
        const [network, prefix] = parseIpv4Cidr(entry);
        return parsed.match(network, prefix);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export function validateIpv4CidrEntries(cidrs: readonly string[]): void {
  for (const entry of cidrs) {
    parseIpv4Cidr(entry);
  }
}
