import type { FilterFieldDef } from '@hivork/contracts/ui';

/** Customer list advanced filter field catalog (IFP-TASK-022). */
export const CUSTOMER_FILTER_FIELDS: FilterFieldDef[] = [
  {
    id: 'name',
    label: 'نام',
    type: 'string',
    placeholder: 'نام مشتری',
  },
  {
    id: 'phone',
    label: 'موبایل',
    type: 'string',
    placeholder: '09xxxxxxxxx',
  },
  {
    id: 'status',
    label: 'وضعیت',
    type: 'enum',
    enumOptions: [
      { value: 'active', label: 'فعال' },
      { value: 'inactive', label: 'غیرفعال' },
    ],
  },
  {
    id: 'createdAt',
    label: 'تاریخ ثبت',
    type: 'date',
  },
  {
    id: 'balanceRial',
    label: 'مانده (ریال)',
    type: 'money_rial',
    placeholder: 'مبلغ به ریال',
  },
  {
    id: 'branchId',
    label: 'شعبه',
    type: 'uuid',
    placeholder: 'شناسه شعبه',
  },
];

export const CUSTOMER_QUICK_FILTER_PRESETS = [
  {
    id: 'overdue',
    label: 'معوقات دار',
    description: 'مشتریان با اقساط معوق',
  },
  {
    id: 'vip',
    label: 'VIP',
    description: 'برچسب VIP',
  },
] as const;
