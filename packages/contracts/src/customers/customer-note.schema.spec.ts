import { describe, expect, it } from 'vitest';

import {
  CreateCustomerNoteInputSchema,
  ListCustomerNotesQuerySchema,
  UpdateCustomerNoteInputSchema,
} from './customer-note.schema.js';

describe('CreateCustomerNoteInputSchema', () => {
  it('accepts body and optional pin', () => {
    const parsed = CreateCustomerNoteInputSchema.parse({
      body: 'یادداشت تست',
      isPinned: true,
    });
    expect(parsed.isPinned).toBe(true);
  });

  it('rejects empty body', () => {
    expect(() => CreateCustomerNoteInputSchema.parse({ body: '   ' })).toThrow();
  });

  it('rejects body over 5000 chars', () => {
    expect(() => CreateCustomerNoteInputSchema.parse({ body: 'a'.repeat(5001) })).toThrow();
  });
});

describe('UpdateCustomerNoteInputSchema', () => {
  it('requires at least one field', () => {
    expect(() => UpdateCustomerNoteInputSchema.parse({})).toThrow();
  });

  it('accepts pin toggle only', () => {
    const parsed = UpdateCustomerNoteInputSchema.parse({ isPinned: false });
    expect(parsed.isPinned).toBe(false);
  });
});

describe('ListCustomerNotesQuerySchema', () => {
  it('defaults limit to 20', () => {
    const query = ListCustomerNotesQuerySchema.parse({});
    expect(query.limit).toBe(20);
  });
});
