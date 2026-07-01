'use client';

import { Button } from '@hivork/ui';
import { useEffect, useState } from 'react';

import { consumeNewIpAlertPending } from '@/lib/auth/new-ip-alert';

type NewIpAlertProps = {
  className?: string;
};

export function NewIpAlert({ className }: NewIpAlertProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(consumeNewIpAlertPending());
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={className ?? 'rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'}
      role="alert"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-medium">ورود از IP جدید</p>
          <p className="text-amber-800">
            این ورود از آدرس IP متفاوتی نسبت به نشست قبلی شما انجام شده است. اگر این ورود
            توسط شما نبوده، نشست‌های فعال را بررسی و رمز عبور را تغییر دهید.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
          onClick={() => setVisible(false)}
        >
          متوجه شدم
        </Button>
      </div>
    </div>
  );
}
