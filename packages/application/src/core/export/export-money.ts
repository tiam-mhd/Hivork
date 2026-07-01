/** Formats rial bigint/string as Persian-grouped toman label for Excel cells. */
export function formatRialAsTomanDisplay(rial: bigint | string): string {
  const value = typeof rial === 'string' ? BigInt(rial) : rial;
  if (value < 0n) {
    throw new Error('rial cannot be negative');
  }
  const toman = value / 10n;
  return `${toman.toLocaleString('fa-IR')} تومان`;
}

/** Raw rial string for export header note / hidden reference column. */
export function formatRialRaw(rial: bigint | string): string {
  const value = typeof rial === 'string' ? rial : rial.toString();
  return value;
}
