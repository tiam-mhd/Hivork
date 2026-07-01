/** Browser-safe installments exports — no Node.js-only entity modules. */
export {
  calculateInstallmentSchedule,
  sumInstallmentScheduleAmounts,
  type CalculateInstallmentScheduleInput,
  type InstallmentScheduleItem,
} from './calculate-installment-schedule.js';
export { addUtcDays, startOfUtcDay } from './date.utils.js';
