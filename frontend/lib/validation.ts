export function validateAddress(addr: string, label: string) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    throw new Error(`${label} address invalid`);
  }
}

export function validatePositiveInt(value: string, label: string) {
  if (!/^[0-9]+$/.test(value) || BigInt(value) <= 0n) {
    throw new Error(`${label} must be > 0`);
  }
}
