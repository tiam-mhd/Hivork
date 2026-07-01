const DEVICE_ID_KEY = 'hivork_device_id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export function getDeviceIdHeader(): Record<string, string> {
  const deviceId = getOrCreateDeviceId();
  return deviceId ? { 'X-Device-Id': deviceId } : {};
}
