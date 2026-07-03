import { describe, expect, it } from 'vitest';

import {
  BankStatementParseError,
  parseBankStatementCsv,
} from './bank-statement-csv.parser.js';

describe('parseBankStatementCsv', () => {
  it('parses valid UTF-8 CSV with Persian digits', () => {
    const csv = Buffer.from(
      'date,reference,amountRial,description\n1405/07/01,TRACE-۱۲۳,۵000000,POS payment\n',
      'utf-8',
    );

    const rows = parseBankStatementCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reference).toBe('TRACE-123');
    expect(rows[0]?.amountRial).toBe(5000000n);
  });

  it('rejects empty file', () => {
    expect(() => parseBankStatementCsv(Buffer.from('   '))).toThrow(BankStatementParseError);
    try {
      parseBankStatementCsv(Buffer.from('   '));
    } catch (error) {
      expect(error).toMatchObject({ code: 'BANK_STATEMENT_EMPTY' });
    }
  });

  it('rejects invalid header', () => {
    const csv = Buffer.from('foo,bar,baz\n1,2,3\n');
    expect(() => parseBankStatementCsv(csv)).toThrow(BankStatementParseError);
    try {
      parseBankStatementCsv(csv);
    } catch (error) {
      expect(error).toMatchObject({ code: 'BANK_STATEMENT_INVALID' });
    }
  });

  it('rejects invalid amount', () => {
    const csv = Buffer.from(
      'date,reference,amountRial,description\n1405/07/01,REF-1,abc,desc\n',
    );
    expect(() => parseBankStatementCsv(csv)).toThrow(BankStatementParseError);
  });
});
