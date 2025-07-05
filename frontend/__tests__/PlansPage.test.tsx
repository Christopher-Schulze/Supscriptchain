import { render, screen } from '@testing-library/react';
import Plans from '../app/plans/page';
import { StoreProvider } from '../lib/store';

const mockUsePlans = jest.fn();
jest.mock('../lib/plansStore', () => ({ usePlans: () => mockUsePlans() }));
jest.mock('../lib/useWallet', () => () => ({ account: '0xabc', connect: jest.fn() }));

function Wrapper() {
  return (
    <StoreProvider>
      <Plans />
    </StoreProvider>
  );
}

describe('Plans page', () => {
  test('renders list of plans', () => {
    mockUsePlans.mockReturnValue({
      plans: [
        { merchant: '0x', token: 'a', tokenDecimals: 18n, price: 1n, billingCycle: 1n, priceInUsd: false, usdPrice: 0n, priceFeedAddress: '0x' },
      ],
      reload: jest.fn(),
    });
    render(<Wrapper />);
    expect(screen.getByText(/Plan 0/)).toBeInTheDocument();
  });
});
