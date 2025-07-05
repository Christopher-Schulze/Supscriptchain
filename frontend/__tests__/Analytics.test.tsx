import { render, screen } from '@testing-library/react';
import Analytics from '../app/analytics/page';
import { StoreProvider } from '../lib/store';

jest.mock('../lib/subgraph', () => ({
  getActiveSubscriptions: jest.fn(),
  getPayments: jest.fn(),
  getPlans: jest.fn(),
}));
import * as subgraph from '../lib/subgraph';
jest.mock('../lib/useWallet', () => () => ({ account: '0xabc', connect: jest.fn() }));

function Wrapper() {
  return (
    <StoreProvider>
      <Analytics />
    </StoreProvider>
  );
}

describe('Analytics page', () => {
  test('shows error when queries fail', async () => {
    (subgraph.getActiveSubscriptions as jest.Mock).mockRejectedValue(new Error('fail'));
    (subgraph.getPayments as jest.Mock).mockResolvedValue([]);
    (subgraph.getPlans as jest.Mock).mockResolvedValue([]);
    render(<Wrapper />);
    expect(await screen.findByText('fail')).toBeInTheDocument();
  });

  test('renders data from subgraph', async () => {
    (subgraph.getActiveSubscriptions as jest.Mock).mockResolvedValue([
      { id: '1', user: 'u1', planId: '0', nextPaymentDate: '1' },
    ]);
    (subgraph.getPayments as jest.Mock).mockResolvedValue([
      { id: '1', user: 'u1', planId: '0', amount: '5' },
    ]);
    (subgraph.getPlans as jest.Mock).mockResolvedValue([
      { id: '0', totalPaid: '10' },
    ]);
    render(<Wrapper />);
    expect(await screen.findByText(/next payment/)).toBeInTheDocument();
    expect(screen.getByText(/total paid/)).toBeInTheDocument();
    expect(screen.getByText(/amount/)).toBeInTheDocument();
  });
});
