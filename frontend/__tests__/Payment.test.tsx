import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Payment from '../app/payment/page';
import MessageBar from '../lib/MessageBar';
import { StoreProvider } from '../lib/store';
import { getContract } from '../lib/contract';

jest.mock('../lib/contract', () => ({
  getContract: jest.fn(),
}));

jest.mock('../lib/useWallet', () => {
  return jest.fn(() => ({ account: '0xabc', connect: jest.fn() }));
});

const mockedGetContract = getContract as jest.Mock;

function Wrapper() {
  return (
    <StoreProvider>
      <MessageBar />
      <Payment />
    </StoreProvider>
  );
}

test('shows message when payment fails', async () => {
  const processPayment = jest.fn().mockRejectedValue(new Error('boom'));
  mockedGetContract.mockResolvedValue({ processPayment });
  render(<Wrapper />);
  const inputs = screen.getAllByRole('textbox');
  await userEvent.type(inputs[0], '0x0000000000000000000000000000000000000001');
  await userEvent.clear(inputs[1]);
  await userEvent.type(inputs[1], '1');
  await userEvent.click(screen.getByText('Process'));
  expect(await screen.findByText('boom')).toBeInTheDocument();
});
