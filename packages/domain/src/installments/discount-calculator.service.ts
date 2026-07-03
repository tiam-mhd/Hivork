export type DiscountValidationSettings = {
  discount_max_percent_bps: number;
  min_installment_rial: bigint;
};

export type DiscountValidationResult = {
  newAmountRial: bigint;
};

export function validateDiscount(input: {
  currentAmountRial: bigint;
  discountRial: bigint;
  settings: DiscountValidationSettings;
}): DiscountValidationResult {
  if (input.discountRial <= 0n) {
    throw new Error('DISCOUNT_MUST_BE_POSITIVE');
  }

  if (input.discountRial > input.currentAmountRial) {
    throw new Error('DISCOUNT_EXCEEDS_AMOUNT');
  }

  const newAmountRial = input.currentAmountRial - input.discountRial;

  if (newAmountRial < input.settings.min_installment_rial) {
    throw new Error('INSTALLMENT_AMOUNT_TOO_LOW');
  }

  if (input.settings.discount_max_percent_bps < 10_000) {
    const maxDiscountRial =
      (input.currentAmountRial * BigInt(input.settings.discount_max_percent_bps)) / 10_000n;

    if (input.discountRial > maxDiscountRial) {
      throw new Error('DISCOUNT_MAX_EXCEEDED');
    }
  }

  return { newAmountRial };
}
