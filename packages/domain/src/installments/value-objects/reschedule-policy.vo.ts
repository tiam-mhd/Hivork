/** Tenant policy for reschedule / accelerate date rules (IFP-079 / IFP-080). */
export type ReschedulePolicySettings = {
  /** When true, `newDueDate` may be before today (Tehran). Default false. */
  allow_past_reschedule?: boolean;
};

export class ReschedulePolicy {
  readonly allowPastDueDate: boolean;

  constructor(settings?: ReschedulePolicySettings) {
    this.allowPastDueDate = settings?.allow_past_reschedule ?? false;
  }

  static fromSettings(settings?: ReschedulePolicySettings): ReschedulePolicy {
    return new ReschedulePolicy(settings);
  }
}
