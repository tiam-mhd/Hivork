import { describe, expect, it } from 'vitest';

import {
  coordinatesArePaired,
  IRAN_LATITUDE_MAX,
  IRAN_LATITUDE_MIN,
  IRAN_LONGITUDE_MAX,
  IRAN_LONGITUDE_MIN,
  isWithinIranBounds,
  TEHRAN_MAP_CENTER,
} from './iran-geo-bounds.js';

describe('iran-geo-bounds', () => {
  it('accepts Tehran coordinates', () => {
    expect(isWithinIranBounds(TEHRAN_MAP_CENTER.latitude, TEHRAN_MAP_CENTER.longitude)).toBe(true);
  });

  it('rejects coordinates outside Iran bounding box', () => {
    expect(isWithinIranBounds(IRAN_LATITUDE_MIN - 1, 51)).toBe(false);
    expect(isWithinIranBounds(IRAN_LATITUDE_MAX + 1, 51)).toBe(false);
    expect(isWithinIranBounds(35, IRAN_LONGITUDE_MIN - 1)).toBe(false);
    expect(isWithinIranBounds(35, IRAN_LONGITUDE_MAX + 1)).toBe(false);
  });

  it('accepts boundary values', () => {
    expect(isWithinIranBounds(IRAN_LATITUDE_MIN, IRAN_LONGITUDE_MIN)).toBe(true);
    expect(isWithinIranBounds(IRAN_LATITUDE_MAX, IRAN_LONGITUDE_MAX)).toBe(true);
  });

  it('requires latitude and longitude to be paired', () => {
    expect(coordinatesArePaired(null, null)).toBe(true);
    expect(coordinatesArePaired(undefined, undefined)).toBe(true);
    expect(coordinatesArePaired(35.6, 51.3)).toBe(true);
    expect(coordinatesArePaired(35.6, null)).toBe(false);
    expect(coordinatesArePaired(null, 51.3)).toBe(false);
  });
});
