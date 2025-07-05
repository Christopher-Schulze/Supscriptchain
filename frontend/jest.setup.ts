import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
// Polyfill for packages expecting TextEncoder/TextDecoder in the browser
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;
jest.mock('@coinbase/wallet-sdk', () => {
  return jest.fn().mockImplementation(() => ({ makeWeb3Provider: jest.fn() }));
});
process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';
process.env.NEXT_PUBLIC_CHAIN_ID = '1';
process.env.NEXT_PUBLIC_RPC_URL = 'http://localhost:8545';
process.env.NEXT_PUBLIC_SUBGRAPH_URL = 'http://localhost:8000';
