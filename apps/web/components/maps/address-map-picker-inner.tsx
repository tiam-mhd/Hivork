'use client';

import { customerValidationMessages } from '@hivork/contracts/customers';
import { Button } from '@hivork/ui';
import L from 'leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import {
  IRAN_LATITUDE_MAX,
  IRAN_LATITUDE_MIN,
  IRAN_LONGITUDE_MAX,
  IRAN_LONGITUDE_MIN,
  IRAN_MAP_PIN_ZOOM,
  isWithinIranBounds,
  TEHRAN_MAP_CENTER,
} from './iran-geo-bounds';
import { configureLeafletDefaultIcon } from './leaflet-icon';

import 'leaflet/dist/leaflet.css';

export type AddressMapPickerInnerProps = {
  latitude: number | null;
  longitude: number | null;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (coords: { latitude: number | null; longitude: number | null }) => void;
  onError?: (message: string | null) => void;
};

type LatLngTuple = [number, number];

function MapViewportSync({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: false });
  }, [center, map, zoom]);

  return null;
}

function MapClickHandler({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (disabled) {
        return;
      }
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export function AddressMapPickerInner({
  latitude,
  longitude,
  disabled = false,
  readOnly = false,
  onChange,
  onError,
}: AddressMapPickerInnerProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const hasPin = latitude !== null && longitude !== null;
  const interactive = !disabled && !readOnly;

  useEffect(() => {
    configureLeafletDefaultIcon();
  }, []);

  const center = useMemo<LatLngTuple>(() => {
    if (hasPin) {
      return [latitude, longitude];
    }
    return [TEHRAN_MAP_CENTER.latitude, TEHRAN_MAP_CENTER.longitude];
  }, [hasPin, latitude, longitude]);

  const zoom = hasPin ? IRAN_MAP_PIN_ZOOM : 6;

  const applyCoordinates = useCallback(
    (lat: number, lng: number) => {
      if (!isWithinIranBounds(lat, lng)) {
        onError?.(customerValidationMessages.coordinateOutOfIran);
        return;
      }
      onError?.(null);
      onChange({ latitude: lat, longitude: lng });
    },
    [onChange, onError],
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!interactive || geoLoading) {
      return;
    }

    if (!navigator.geolocation) {
      onError?.(customerValidationMessages.geolocationUnavailable);
      return;
    }

    setGeoLoading(true);
    onError?.(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        applyCoordinates(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          onError?.(customerValidationMessages.geolocationDenied);
          return;
        }
        onError?.(customerValidationMessages.geolocationUnavailable);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [applyCoordinates, geoLoading, interactive, onError]);

  const handleClear = useCallback(() => {
    if (!interactive) {
      return;
    }
    onError?.(null);
    onChange({ latitude: null, longitude: null });
  }, [interactive, onChange, onError]);

  return (
    <div className="flex flex-col gap-3">
      {!readOnly ? (
        <p className="text-xs text-muted-foreground">{customerValidationMessages.locationOptionalHelp}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={interactive}
          dragging={interactive}
          doubleClickZoom={interactive}
          touchZoom={interactive}
          className={`w-full z-0 ${readOnly ? 'h-40 pointer-events-none' : 'h-64'}`}
          maxBounds={L.latLngBounds(
            [IRAN_LATITUDE_MIN, IRAN_LONGITUDE_MIN],
            [IRAN_LATITUDE_MAX, IRAN_LONGITUDE_MAX],
          )}
          maxBoundsViscosity={1}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewportSync center={center} zoom={zoom} />
          <MapClickHandler disabled={!interactive} onPick={applyCoordinates} />
          {hasPin ? (
            <Marker
              draggable={interactive}
              position={[latitude, longitude]}
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target as L.Marker;
                  const next = marker.getLatLng();
                  applyCoordinates(next.lat, next.lng);
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!interactive || geoLoading}
            onClick={handleUseCurrentLocation}
          >
            {geoLoading ? 'در حال دریافت موقعیت…' : 'استفاده از موقعیت فعلی'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!interactive || !hasPin}
            onClick={handleClear}
          >
            پاک کردن موقعیت
          </Button>
        </div>
      ) : null}
    </div>
  );
}
