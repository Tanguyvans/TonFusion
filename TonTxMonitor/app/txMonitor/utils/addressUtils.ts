import { Address } from '@ton/core';

/**
 * TONアドレスを16進数文字列に変換する
 * 例: "kQCSnKC--Igca13vrtnVI-I0FYJxAvcJJNZDxZfRAVGeWJlq" -> "0:929ca0bef8881c6b5defaed9d523e23415827102f70924d643c597d101519e58"
 * @throws 無効なアドレスの場合にスローされる
 */
export function addressToHexString(address: string | { address: string }): string {
  // オブジェクト形式の場合は address プロパティを使用
  const addressStr = typeof address === 'string' ? address : address.address;
  
  if (!addressStr) {
    throw new Error('Empty address provided');
  }
  
  // アドレスをパース
  const addr = Address.parse(addressStr);
  
  // 16進数形式に変換
  const hex = addr.toRawString(); // 16進数文字列を取得
  return `${hex.toLowerCase()}`; // 小文字に変換してリターン
}
