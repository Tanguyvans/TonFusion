import { Address } from '@ton/core';

/**
 * Convert TON address to a hexadecimal string
 * Example: "kQCSnKC--Igca13vrtnVI-I0FYJxAvcJJNZDxZfRAVGeWJlq" -> "0:929ca0bef8881c6b5defaed9d523e23415827102f70924d643c597d101519e58"
 * @throws Throws if the address is invalid
 */
export function addressToHexString(address: string | { address: string }): string {
  // Use address property if input is object
  const addressStr = typeof address === 'string' ? address : address.address;
  
  if (!addressStr) {
    throw new Error('Empty address provided');
  }
  
  // Parse address
  const addr = Address.parse(addressStr);
  
  // Convert to hex string
  const hex = addr.toRawString(); // Get hex string
  return `${hex.toLowerCase()}`; // Return as lowercase
}
