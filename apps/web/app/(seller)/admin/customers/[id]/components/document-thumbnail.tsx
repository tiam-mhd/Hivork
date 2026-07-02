'use client';

import type { CustomerDocumentDto } from '@hivork/contracts/customers';
import { useEffect, useState } from 'react';

import { getCustomerDocumentDownloadUrl } from '@/lib/api/customer-documents';

function isImageMime(mimeType: string): boolean {
  return mimeType === 'image/jpeg' || mimeType === 'image/png';
}

export function DocumentThumbnail({
  customerId,
  document,
}: {
  customerId: string;
  document: CustomerDocumentDto;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImageMime(document.mimeType)) {
      return;
    }

    let cancelled = false;

    void getCustomerDocumentDownloadUrl(customerId, document.id)
      .then((result) => {
        if (!cancelled) {
          setUrl(result.url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, document.id, document.mimeType]);

  if (!isImageMime(document.mimeType)) {
    return (
      <span className="text-4xl" aria-hidden>
        📄
      </span>
    );
  }

  if (!url) {
    return (
      <span className="text-4xl opacity-60" aria-hidden>
        🖼️
      </span>
    );
  }

  return (
    <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
  );
}
