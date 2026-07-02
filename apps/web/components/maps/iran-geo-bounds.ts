/** Browser-safe copy of customer map bounds to avoid pulling server-only domain code into the web bundle. */
export const IRAN_LATITUDE_MIN = 25;
export const IRAN_LATITUDE_MAX = 40;
export const IRAN_LONGITUDE_MIN = 44;
export const IRAN_LONGITUDE_MAX = 64;

export const TEHRAN_MAP_CENTER = {
  latitude: 35.6892,
  longitude: 51.389,
} as const;

export const IRAN_MAP_PIN_ZOOM = 12;

export function isWithinIranBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= IRAN_LATITUDE_MIN &&
    latitude <= IRAN_LATITUDE_MAX &&
    longitude >= IRAN_LONGITUDE_MIN &&
    longitude <= IRAN_LONGITUDE_MAX
  );
}
