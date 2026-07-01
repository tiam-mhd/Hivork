import { describe, expect, it } from 'vitest';

import { isClientIpAllowed } from './ip-match.js';

describe('isClientIpAllowed', () => {
  it('denies when cidrs list is empty (fail-safe)', () => {
    expect(isClientIpAllowed('1.2.3.4', [])).toBe(false);
  });

  it('denies when client IP is missing', () => {
    expect(isClientIpAllowed(undefined, ['1.2.3.4'])).toBe(false);
  });

  it('matches exact IPv4 entry', () => {
    expect(isClientIpAllowed('203.0.113.10', ['203.0.113.10'])).toBe(true);
    expect(isClientIpAllowed('203.0.113.11', ['203.0.113.10'])).toBe(false);
  });

  it('matches IPv4 CIDR range', () => {
    expect(isClientIpAllowed('10.0.0.5', ['10.0.0.0/8'])).toBe(true);
    expect(isClientIpAllowed('11.0.0.1', ['10.0.0.0/8'])).toBe(false);
  });

  it('denies IPv6 clients in v1', () => {
    expect(isClientIpAllowed('2001:db8::1', ['10.0.0.0/8'])).toBe(false);
  });
});
