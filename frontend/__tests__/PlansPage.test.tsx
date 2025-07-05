import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  test('renders list of plans and shows details', async () => {
    mockUsePlans.mockReturnValue({
      plans: [
        {
          id: 0n,
          merchant: '0x',
          token: 'a',
          tokenDecimals: 18n,
          price: 1n,
          billingCycle: 1n,
          priceInUsd: false,
          usdPrice: 0n,
          priceFeedAddress: '0x',
          active: true,
        },
      ],
      reload: jest.fn(),
    });
    render(<Wrapper />);
    const btn = screen.getByText(/Plan 0/);
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(await screen.findByTestId('plan-details')).toBeInTheDocument();
  });
});
