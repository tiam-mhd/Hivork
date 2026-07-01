'use client';

import { useCallback, useEffect } from 'react';

export const UNSAVED_LEAVE_MESSAGE =
  'تغییرات ذخیره نشده‌اند. آیا می‌خواهید خارج شوید؟';

export function shouldConfirmLeave(isDirty: boolean): boolean {
  return isDirty;
}

export function useUnsavedWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const confirmLeave = useCallback(() => {
    if (!shouldConfirmLeave(isDirty)) {
      return true;
    }
    return window.confirm(UNSAVED_LEAVE_MESSAGE);
  }, [isDirty]);

  return { confirmLeave, isDirty };
}
