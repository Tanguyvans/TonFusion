/**
 * Calculate absolute difference between two query IDs
 * Returns undefined if conversion fails
 */
export function calcQueryIdDiff(a: string, b: string): bigint | undefined {
  try {
    const aBig = BigInt(a);
    const bBig = BigInt(b);
    return aBig > bBig ? aBig - bBig : bBig - aBig;
  } catch {
    return undefined;
  }
}
