import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Manage from '../app/manage/page';
import MessageBar from '../lib/MessageBar';
import { StoreProvider } from '../lib/store';
import { getContract, subscribe, cancelSubscription } from '../lib/contract';

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
  subscribe: jest.fn(),
  cancelSubscription: jest.fn(),
}));

jest.mock('../lib/useWallet', () => {
  return jest.fn(() => ({ account: '0xabc', connect: jest.fn() }));
});

const mockedSubscribe = subscribe as jest.Mock;
const mockedCancel = cancelSubscription as jest.Mock;

function Wrapper() {
  return (
    <StoreProvider>
      <MessageBar />
      <Manage />
    </StoreProvider>
  );
}

test('shows message when subscribe fails', async () => {
  mockedSubscribe.mockRejectedValue(new Error('fail'));
  render(<Wrapper />);
  const planInput = screen.getAllByRole('textbox')[0];
  await userEvent.clear(planInput);
  await userEvent.type(planInput, '1');
  await userEvent.click(screen.getByText('Subscribe'));
  expect(await screen.findByText('fail')).toBeInTheDocument();
});

test('shows error on invalid v signature', async () => {
  render(<Wrapper />);
  const inputs = screen.getAllByRole('textbox');
  await userEvent.clear(inputs[0]);
  await userEvent.type(inputs[0], '1');
  await userEvent.clear(inputs[1]);
  await userEvent.type(inputs[1], '100');
  await userEvent.type(inputs[2], 'abc');
  await userEvent.type(inputs[3], '0x' + '1'.repeat(64));
  await userEvent.type(inputs[4], '0x' + '2'.repeat(64));
  await userEvent.click(screen.getByText('Subscribe with Permit'));
  expect(await screen.findByText('invalid v')).toBeInTheDocument();
});

test('shows error on invalid r signature', async () => {
  render(<Wrapper />);
  const inputs = screen.getAllByRole('textbox');
  await userEvent.clear(inputs[0]);
  await userEvent.type(inputs[0], '1');
  await userEvent.clear(inputs[1]);
  await userEvent.type(inputs[1], '100');
  await userEvent.type(inputs[2], '27');
  await userEvent.type(inputs[3], '0x123');
  await userEvent.type(inputs[4], '0x' + '2'.repeat(64));
  await userEvent.click(screen.getByText('Subscribe with Permit'));
  expect(await screen.findByText('invalid r')).toBeInTheDocument();
});

