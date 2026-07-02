'use client';

import { Input } from '@hivork/ui';
import { useMemo, useState } from 'react';

import {
  formatShortcutKeys,
  getShortcutsForScope,
  type ShortcutScope,
} from '@/lib/keyboard/shortcuts-registry';

type ShortcutsHelpModalProps = {
  open: boolean;
  onClose: () => void;
  scope?: ShortcutScope | 'all';
};

export function ShortcutsHelpModal({ open, onClose, scope = 'all' }: ShortcutsHelpModalProps) {
  const [query, setQuery] = useState('');

  const shortcuts = useMemo(() => {
    const items = getShortcutsForScope(scope);
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }
    return items.filter(
      (item) =>
        item.description.toLowerCase().includes(normalized) ||
        item.keys.toLowerCase().includes(normalized) ||
        item.descriptionEn?.toLowerCase().includes(normalized),
    );
  }, [query, scope]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="راهنمای میانبرها"
        className="flex max-h-[min(80vh,40rem)] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">میانبرهای صفحه‌کلید</h2>
          <button type="button" className="text-sm underline" onClick={onClose}>
            بستن (Esc)
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو در میانبرها…"
            aria-label="جستجو در میانبرها"
          />
        </div>

        <div className="overflow-auto px-4 py-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 text-start font-medium">میانبر</th>
                <th className="py-2 text-start font-medium">عمل</th>
                <th className="hidden py-2 text-start font-medium sm:table-cell">محدوده</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    میانبری یافت نشد
                  </td>
                </tr>
              ) : (
                shortcuts.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 font-mono text-xs sm:text-sm">
                      {item.sequence?.join(' سپس ') ?? formatShortcutKeys(item.keys)}
                    </td>
                    <td className="py-2">{item.description}</td>
                    <td className="hidden py-2 text-muted-foreground sm:table-cell">{item.scope}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
