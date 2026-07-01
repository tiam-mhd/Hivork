import { describe, expect, it } from 'vitest';

import { detectNewIp, maskIpForDisplay } from './login-snapshot.js';

describe('login-snapshot helpers', () => {
  describe('detectNewIp', () => {
    it('returns false when previous ip is missing', () => {
      expect(detectNewIp(null, '1.2.3.4')).toBe(false);
      expect(detectNewIp(undefined, '1.2.3.4')).toBe(false);
    });

    it('returns false when current ip is missing', () => {
      expect(detectNewIp('1.2.3.4', undefined)).toBe(false);
    });

    it('returns false when ip is unchanged', () => {
      expect(detectNewIp('1.2.3.4', '1.2.3.4')).toBe(false);
    });

    it('returns true when ip changed', () => {
      expect(detectNewIp('1.2.3.4', '5.6.7.8')).toBe(true);
    });
  });

  describe('maskIpForDisplay', () => {
    it('masks ipv4 middle octets', () => {
      expect(maskIpForDisplay('1.2.3.4')).toBe('1.2.*.*');
    });

    it('masks ipv6 prefix only', () => {
      expect(maskIpForDisplay('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:…');
    });
  });
});
