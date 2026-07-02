/** Approximate Iran bounding box — IFP-045 */
export const IRAN_LATITUDE_MIN = 25;
export const IRAN_LATITUDE_MAX = 40;
export const IRAN_LONGITUDE_MIN = 44;
export const IRAN_LONGITUDE_MAX = 64;

export const TEHRAN_MAP_CENTER = {
  latitude: 35.6892,
  longitude: 51.389,
} as const;

export const IRAN_MAP_DEFAULT_ZOOM = 6;
export const IRAN_MAP_PIN_ZOOM = 12;

export function isWithinIranBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= IRAN_LATITUDE_MIN &&
    latitude <= IRAN_LATITUDE_MAX &&
    longitude >= IRAN_LONGITUDE_MIN &&
    longitude <= IRAN_LONGITUDE_MAX
  );
}

export function coordinatesArePaired(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  const hasLat = latitude !== null && latitude !== undefined;
  const hasLng = longitude !== null && longitude !== undefined;
  return hasLat === hasLng;
}
