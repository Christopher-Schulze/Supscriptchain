import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Manage from '../app/manage/page';
import MessageBar from '../lib/MessageBar';
import { StoreProvider } from '../lib/store';
import { getContract } from '../lib/contract';

jest.mock(
  'typechain/factories/contracts/interfaces/AggregatorV3Interface__factory',
  () => ({
    AggregatorV3Interface__factory: {
      connect: jest.fn(),
    },
  }),
  { virtual: true }
);

jest.mock('../lib/contract', () => ({
  getContract: jest.fn(),
  subscribeWithPermit: jest.fn(),
}));

jest.mock('../lib/useWallet', () => {
  return jest.fn(() => ({ account: '0xabc', connect: jest.fn() }));
});

const mockedGetContract = getContract as jest.Mock;

function Wrapper() {
  return (
    <StoreProvider>
      <MessageBar />
      <Manage />
    </StoreProvider>
  );
}

test('shows message when subscribe fails', async () => {
  const subscribe = jest.fn().mockRejectedValue(new Error('fail'));
  const cancelSubscription = jest.fn();
  mockedGetContract.mockResolvedValue({ subscribe, cancelSubscription });
  render(<Wrapper />);
  const planInput = screen.getAllByRole('textbox')[0];
  await userEvent.clear(planInput);
  await userEvent.type(planInput, '1');
  await userEvent.click(screen.getByText('Subscribe'));
  expect(await screen.findByText('fail')).toBeInTheDocument();
});
