import L from 'leaflet';

let configured = false;

/** Fix default marker icons when bundling Leaflet with Next.js. */
export function configureLeafletDefaultIcon(): void {
  if (configured || typeof window === 'undefined') {
    return;
  }

  configured = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}
