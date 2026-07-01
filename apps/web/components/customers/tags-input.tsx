'use client';

import { Input, Label } from '@hivork/ui';
import { useId, useState } from 'react';

import { TagBadge } from '@/components/customers/tag-badge';

type TagsInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  helpText?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
};

export function TagsInput({
  value,
  onChange,
  label = 'برچسب‌ها',
  helpText = 'با Enter برچسب اضافه کنید.',
  placeholder = 'vip, regular',
  error,
  disabled = false,
  id,
}: TagsInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const [draft, setDraft] = useState('');

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,$/, '');
    if (!tag || value.includes(tag) || value.length >= 20) {
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  const describedBy = [helpText ? helpId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap gap-1">
        {value.map((tag) => (
          <button
            key={tag}
            type="button"
            className="inline-flex items-center gap-1"
            onClick={() => removeTag(tag)}
            disabled={disabled}
            aria-label={`حذف برچسب ${tag}`}
          >
            <TagBadge label={tag} />
            <span className="text-xs text-neutral-500">×</span>
          </button>
        ))}
      </div>
      <Input
        id={inputId}
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addTag(draft);
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            addTag(draft);
          }
        }}
      />
      {helpText ? (
        <p id={helpId} className="text-xs text-neutral-500">
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
