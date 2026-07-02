export const REALTIME_EVENT_TITLES_FA: Record<string, string> = {
  'system.ping': 'پیام آزمایشی',
  'system.connected': 'اتصال برقرار شد',
  'system.announcement': 'اطلاعیه سیستم',
  'payment.reported': 'گزارش پرداخت جدید',
  'installment.due': 'سررسید قسط',
  'sale.created': 'فروش جدید',
  'tenant.suspended': 'حساب معلق شد',
};

export function getRealtimeEventTitle(type: string): string {
  return REALTIME_EVENT_TITLES_FA[type] ?? 'اعلان جدید';
}
