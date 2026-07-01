import { describe, expect, it } from 'vitest';

import { ApiErrorSchema, ErrorCodes, parseApiError } from './error.schema.js';

describe('TASK-053 error contracts', () => {
  describe('ApiErrorSchema', () => {
    it('parses standard API error payloads', () => {
      const parsed = ApiErrorSchema.parse({
        code: ErrorCodes.NOT_FOUND,
        message: 'Resource not found',
        details: { id: 'abc' },
      });

      expect(parsed.code).toBe('NOT_FOUND');
      expect(parsed.details).toEqual({ id: 'abc' });
    });

    it('allows optional details', () => {
      const parsed = ApiErrorSchema.parse({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid input',
      });

      expect(parsed.details).toBeUndefined();
    });
  });

  describe('ErrorCodes', () => {
    it('includes soft-delete policy codes', () => {
      expect(ErrorCodes.HARD_DELETE_FORBIDDEN).toBe('HARD_DELETE_FORBIDDEN');
      expect(ErrorCodes.ALREADY_DELETED).toBe('ALREADY_DELETED');
      expect(ErrorCodes.NOT_DELETED).toBe('NOT_DELETED');
      expect(ErrorCodes.RESTORE_FORBIDDEN).toBe('RESTORE_FORBIDDEN');
    });

    it('includes auth and plan codes', () => {
      expect(ErrorCodes.OTP_INVALID).toBe('OTP_INVALID');
      expect(ErrorCodes.PLAN_LIMIT_EXCEEDED).toBe('PLAN_LIMIT_EXCEEDED');
      expect(ErrorCodes.MODULE_NOT_ENABLED).toBe('MODULE_NOT_ENABLED');
    });
  });

  describe('parseApiError', () => {
    it('returns null for invalid payloads', () => {
      expect(parseApiError({ error: 'nope' })).toBeNull();
    });

    it('parses valid error bodies', () => {
      expect(
        parseApiError({
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Internal server error',
        }),
      ).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    });
  });
});
