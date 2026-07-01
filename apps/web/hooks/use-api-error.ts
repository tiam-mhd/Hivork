'use client';

import { useCallback } from 'react';

import { ApiClientError } from '@/lib/api/client';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';

export function useApiError() {
  const resolve = useCallback((error: unknown): string => {
    if (error instanceof ApiClientError) {
      return getErrorMessageFa(error.code, error.message);
    }
    if (error instanceof Error) {
      return error.message;
    }
    return getErrorMessageFa('INTERNAL_ERROR');
  }, []);

  return { resolve };
}
