export type LoginSnapshot = {
  at: string;
  ip?: string;
  deviceLabel?: string;
};

export type StaffLoginDisplayFields = {
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  lastLoginDeviceLabel: string | null;
  previousLoginAt: Date | null;
  previousLoginIp: string | null;
  previousLoginDeviceLabel: string | null;
};

export type RecordStaffLoginInput = {
  ipAddress?: string;
  deviceLabel?: string;
  at: Date;
};

export type PreviousStaffLoginSnapshot = {
  previousAt: Date | null;
  previousIp: string | null;
  previousDeviceLabel: string | null;
};

export function toLoginSnapshot(
  at: Date | null,
  ip: string | null | undefined,
  deviceLabel: string | null | undefined,
): LoginSnapshot | null {
  if (!at) {
    return null;
  }

  return {
    at: at.toISOString(),
    ip: ip ?? undefined,
    deviceLabel: deviceLabel ?? undefined,
  };
}

export function detectNewIp(
  previousIp: string | null | undefined,
  currentIp: string | undefined,
): boolean {
  if (!previousIp || !currentIp) {
    return false;
  }

  return previousIp !== currentIp;
}

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
