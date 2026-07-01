import type { Request } from 'express';

export type ClientDeviceContext = {
  clientIp?: string;
  userAgent?: string;
  deviceId?: string;
};

export function readClientDeviceContext(req: Request): ClientDeviceContext {
  const rawDeviceId = req.headers['x-device-id'];
  const deviceId =
    typeof rawDeviceId === 'string' && rawDeviceId.trim().length > 0
      ? rawDeviceId.trim()
      : undefined;

  return {
    clientIp: req.ip,
    userAgent: req.headers['user-agent'],
    deviceId,
  };
}
