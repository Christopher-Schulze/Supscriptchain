import { render, screen } from '@testing-library/react';
import NetworkStatus from '../lib/NetworkStatus';
import { StoreProvider } from '../lib/store';
import MessageBar from '../lib/MessageBar';

const mockGetNetwork = jest.fn();
const mockGetBlockNumber = jest.fn();

jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn(() => ({
      getNetwork: mockGetNetwork,
      getBlockNumber: mockGetBlockNumber,
    })),
    JsonRpcProvider: jest.fn(() => ({
      getNetwork: mockGetNetwork,
      getBlockNumber: mockGetBlockNumber,
    })),
  },
}));

function Wrapper() {
  return (
    <StoreProvider>
      <MessageBar />
      <NetworkStatus />
    </StoreProvider>
  );
}

test('displays network name and block number', async () => {
  mockGetNetwork.mockResolvedValue({ name: 'testnet', chainId: 1 });
  mockGetBlockNumber.mockResolvedValue(123);
  render(<Wrapper />);
  expect(await screen.findByText('testnet #123')).toBeInTheDocument();
});

test('shows error message when provider fails', async () => {
  mockGetNetwork.mockRejectedValue(new Error('fail'));
  render(<Wrapper />);
  expect(await screen.findByText('fail')).toBeInTheDocument();
});
