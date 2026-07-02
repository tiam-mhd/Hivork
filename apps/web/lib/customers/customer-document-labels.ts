import type { CustomerDocumentTypeDto } from '@hivork/contracts/customers';

export const CUSTOMER_DOCUMENT_TYPE_LABELS: Record<CustomerDocumentTypeDto, string> = {
  national_id: 'کارت ملی',
  birth_certificate: 'شناسنامه',
  contract: 'قرارداد',
  photo: 'تصویر',
  other: 'سایر',
};

export const CUSTOMER_DOCUMENT_TYPE_OPTIONS: Array<{
  value: CustomerDocumentTypeDto;
  label: string;
}> = (
  Object.entries(CUSTOMER_DOCUMENT_TYPE_LABELS) as Array<[CustomerDocumentTypeDto, string]>
).map(([value, label]) => ({ value, label }));
