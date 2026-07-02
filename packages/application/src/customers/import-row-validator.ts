import { normalizePhone } from '@hivork/contracts';

import type { CreateTenantCustomerInput } from './create-tenant-customer.use-case.js';
import type { CustomerImportParsedRow } from './excel/customer-import.parser.js';
import type {
  CustomerCategoryLookupResult,
  ICustomerCategoryReader,
} from '../ports/customer-category.reader.port.js';

export type ImportCustomerRowErrorCode =
  | 'INVALID_PHONE'
  | 'INVALID_SECONDARY_PHONE'
  | 'SECONDARY_PHONE_EQUALS_PRIMARY'
  | 'CUSTOMER_PHONE_DUPLICATE_IN_FILE'
  | 'CUSTOMER_ALREADY_EXISTS'
  | 'TENANT_PLAN_LIMIT_EXCEEDED'
  | 'FIELD_REQUIRED'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_AMBIGUOUS'
  | 'INVALID_EMAIL'
  | 'INVALID_EMERGENCY_CONTACT';

export type ImportCustomerRowError = {
  row: number;
  phone: string | null;
  error: ImportCustomerRowErrorCode;
  message?: string;
};

export type ValidatedImportRow = {
  row: CustomerImportParsedRow;
  normalizedPhone: string;
  createInput: Pick<
    CreateTenantCustomerInput,
    | 'phone'
    | 'name'
    | 'email'
    | 'nationalId'
    | 'localCode'
    | 'tags'
    | 'notes'
    | 'categoryId'
    | 'addresses'
    | 'contactPhones'
    | 'emergencyContacts'
  >;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NATIONAL_ID_PATTERN = /^\d{10}$/;

export class ImportRowValidator {
  constructor(private readonly categories: ICustomerCategoryReader) {}

  async validateRow(
    row: CustomerImportParsedRow,
    options: { tenantId: string; seenPhones: Set<string> },
  ): Promise<{ ok: true; value: ValidatedImportRow } | { ok: false; error: ImportCustomerRowError }> {
    if (!row.phone) {
      return {
        ok: false,
        error: { row: row.rowNumber, phone: null, error: 'FIELD_REQUIRED', message: 'phone is required' },
      };
    }

    if (!row.name) {
      return {
        ok: false,
        error: { row: row.rowNumber, phone: row.phone, error: 'FIELD_REQUIRED', message: 'name is required' },
      };
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(row.phone);
    } catch {
      return {
        ok: false,
        error: { row: row.rowNumber, phone: row.phone, error: 'INVALID_PHONE' },
      };
    }

    if (options.seenPhones.has(normalizedPhone)) {
      return {
        ok: false,
        error: {
          row: row.rowNumber,
          phone: normalizedPhone,
          error: 'CUSTOMER_PHONE_DUPLICATE_IN_FILE',
        },
      };
    }

    if (row.email && !EMAIL_PATTERN.test(row.email)) {
      return {
        ok: false,
        error: { row: row.rowNumber, phone: normalizedPhone, error: 'INVALID_EMAIL' },
      };
    }

    if (row.nationalId && !NATIONAL_ID_PATTERN.test(row.nationalId)) {
      return {
        ok: false,
        error: { row: row.rowNumber, phone: normalizedPhone, error: 'FIELD_REQUIRED', message: 'national_id invalid' },
      };
    }

    const hasEmergencyName = Boolean(row.emergencyName?.trim());
    const hasEmergencyPhone = Boolean(row.emergencyPhone?.trim());
    if (hasEmergencyName !== hasEmergencyPhone) {
      return {
        ok: false,
        error: {
          row: row.rowNumber,
          phone: normalizedPhone,
          error: 'INVALID_EMERGENCY_CONTACT',
        },
      };
    }

    let categoryId: string | undefined;
    if (row.category?.trim()) {
      const lookup = await this.categories.resolveBySlugOrName(options.tenantId, row.category.trim());
      const categoryError = this.mapCategoryLookup(row.rowNumber, normalizedPhone, lookup);
      if (categoryError) {
        return { ok: false, error: categoryError };
      }

      if (lookup.status === 'found') {
        categoryId = lookup.categoryId;
      }
    }

    let secondaryPhone: string | undefined;
    if (row.phone2?.trim()) {
      try {
        secondaryPhone = normalizePhone(row.phone2);
      } catch {
        return {
          ok: false,
          error: {
            row: row.rowNumber,
            phone: normalizedPhone,
            error: 'INVALID_SECONDARY_PHONE',
          },
        };
      }

      if (secondaryPhone === normalizedPhone) {
        return {
          ok: false,
          error: {
            row: row.rowNumber,
            phone: normalizedPhone,
            error: 'SECONDARY_PHONE_EQUALS_PRIMARY',
          },
        };
      }
    }

    let emergencyPhoneNormalized: string | undefined;
    if (row.emergencyPhone?.trim()) {
      try {
        emergencyPhoneNormalized = normalizePhone(row.emergencyPhone);
      } catch {
        return {
          ok: false,
          error: {
            row: row.rowNumber,
            phone: normalizedPhone,
            error: 'INVALID_EMERGENCY_CONTACT',
          },
        };
      }
    }

    options.seenPhones.add(normalizedPhone);

    const tags = parseTags(row.tags);
    const addresses =
      row.addressLine?.trim() || row.city?.trim()
        ? [
            {
              line1: row.addressLine?.trim() || row.city?.trim() || '—',
              city: row.city?.trim() ?? null,
              isPrimary: true,
            },
          ]
        : undefined;

    const contactPhones = secondaryPhone
      ? [{ phone: secondaryPhone, isPrimarySecondary: true }]
      : undefined;

    const emergencyContacts =
      row.emergencyName?.trim() && emergencyPhoneNormalized
        ? [
            {
              name: row.emergencyName.trim(),
              phone: emergencyPhoneNormalized,
              isPrimary: true,
            },
          ]
        : undefined;

    return {
      ok: true,
      value: {
        row,
        normalizedPhone,
        createInput: {
          phone: normalizedPhone,
          name: row.name.trim(),
          email: row.email ?? undefined,
          nationalId: row.nationalId ?? undefined,
          localCode: row.localCode ?? undefined,
          tags,
          notes: row.notes ?? undefined,
          categoryId,
          addresses,
          contactPhones,
          emergencyContacts,
        },
      },
    };
  }

  private mapCategoryLookup(
    rowNumber: number,
    phone: string,
    lookup: CustomerCategoryLookupResult,
  ): ImportCustomerRowError | null {
    switch (lookup.status) {
      case 'found':
        return null;
      case 'not_found':
        return { row: rowNumber, phone, error: 'CATEGORY_NOT_FOUND' };
      case 'ambiguous':
        return { row: rowNumber, phone, error: 'CATEGORY_AMBIGUOUS' };
    }
  }
}

function parseTags(raw: string | null): string[] | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  const tags = [
    ...new Set(
      raw
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];

  return tags.length > 0 ? tags : undefined;
}
