/**
 * 2つのクエリID（BigInt変換可能な値）の絶対差分を計算
 * 変換できなければ undefined を返す
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
