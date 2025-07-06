'use client';
import { formatUnits } from 'ethers';

export interface PriceProps {
  amount: bigint | string;
  decimals: bigint;
  symbol: string;
}

export default function Price({ amount, decimals, symbol }: PriceProps) {
  const value = typeof amount === 'bigint' ? formatUnits(amount, Number(decimals)) : amount;
  return <span>{`${value} ${symbol}`}</span>;
}
