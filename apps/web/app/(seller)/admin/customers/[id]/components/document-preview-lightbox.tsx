'use client';

import { Button } from '@hivork/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

type DocumentPreviewLightboxProps = {
  open: boolean;
  title: string;
  imageUrl: string;
  onClose: () => void;
};

export function DocumentPreviewLightbox({
  open,
  title,
  imageUrl,
  onClose,
}: DocumentPreviewLightboxProps) {
  const [scale, setScale] = useState(1);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const resetZoom = useCallback(() => {
    setScale(1);
    pinchRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      resetZoom();
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === '+' || event.key === '=') {
        setScale((value) => Math.min(4, value + 0.25));
      }
      if (event.key === '-') {
        setScale((value) => Math.max(1, value - 0.25));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open, resetZoom]);

  if (!open) {
    return null;
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-[60] flex flex-col bg-black/85 p-4"
      aria-label={`پیش‌نمایش ${title}`}
      onClick={onClose}
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="truncate text-sm font-medium">{title}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10"
            onClick={() => setScale((value) => Math.max(1, value - 0.25))}
            aria-label="کوچک‌تر"
          >
            −
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10"
            onClick={() => setScale((value) => Math.min(4, value + 0.25))}
            aria-label="بزرگ‌تر"
          >
            +
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden touch-pan-y"
        onClick={(event) => event.stopPropagation()}
        onWheel={(event) => {
          event.preventDefault();
          const delta = event.deltaY < 0 ? 0.1 : -0.1;
          setScale((value) => Math.min(4, Math.max(1, value + delta)));
        }}
        onTouchStart={(event) => {
          if (event.touches.length !== 2) {
            return;
          }
          const [a, b] = [event.touches[0]!, event.touches[1]!];
          const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          pinchRef.current = { distance, scale };
        }}
        onTouchMove={(event) => {
          if (event.touches.length !== 2 || !pinchRef.current) {
            return;
          }
          const [a, b] = [event.touches[0]!, event.touches[1]!];
          const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          const ratio = distance / pinchRef.current.distance;
          setScale(Math.min(4, Math.max(1, pinchRef.current.scale * ratio)));
        }}
        onTouchEnd={() => {
          pinchRef.current = null;
        }}
      >
        <img
          src={imageUrl}
          alt={title}
          className="max-h-full max-w-full object-contain transition-transform duration-100"
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      </div>
    </dialog>
  );
}
