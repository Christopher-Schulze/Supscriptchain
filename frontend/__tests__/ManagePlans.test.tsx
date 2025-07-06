import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManagePlans from '../app/plans/manage/page';
import { usePlans } from '../lib/plansStore';
import { StoreProvider } from '../lib/store';
import { updatePlan, updateMerchant, disablePlan } from '../lib/contract';

jest.mock('../lib/plansStore');
jest.mock('../lib/contract', () => ({
  updatePlan: jest.fn(),
  updateMerchant: jest.fn(),
  disablePlan: jest.fn(),
}));
jest.mock('../lib/useWallet', () => () => ({
  account: '0xabc',
  connect: jest.fn(),
}));

const mockUsePlans = usePlans as jest.Mock;
const mockUpdate = updatePlan as jest.Mock;
const mockUpdateMerchant = updateMerchant as jest.Mock;
const mockDisablePlan = disablePlan as jest.Mock;

function Wrapper() {
  return (
    <StoreProvider>
      <ManagePlans />
    </StoreProvider>
  );
}

describe('ManagePlans page', () => {
  const plan = {
    id: 0n,
    merchant: '0x',
    token: 'a',
    tokenDecimals: 18n,
    price: '0.000000000000000001',
    billingCycle: 1n,
    priceInUsd: false,
    usdPrice: 0n,
    priceFeedAddress: '0x',
    active: true,
  };

  test('validates billing input', async () => {
    mockUsePlans.mockReturnValue({ plans: [plan], reload: jest.fn() });
    render(<Wrapper />);
    await userEvent.selectOptions(screen.getByRole('combobox'), ['0']);
    await userEvent.click(screen.getByText('Update'));
    expect(await screen.findByText('billing > 0')).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('shows contract error', async () => {
    mockUsePlans.mockReturnValue({ plans: [plan], reload: jest.fn() });
    mockUpdate.mockRejectedValue(new Error('Transaction failed: boom'));
    render(<Wrapper />);
    await userEvent.selectOptions(screen.getByRole('combobox'), ['0']);
    await userEvent.type(screen.getByLabelText('Billing (seconds)'), '1');
    await userEvent.click(screen.getByText('Update'));
    expect(await screen.findByText('Transaction failed: boom')).toBeInTheDocument();
  });

  test('validates merchant address', async () => {
    mockUsePlans.mockReturnValue({ plans: [plan], reload: jest.fn() });
    render(<Wrapper />);
    await userEvent.selectOptions(screen.getByRole('combobox'), ['0']);
    await userEvent.type(screen.getByLabelText('Merchant'), 'foo');
    await userEvent.click(screen.getByText('Update Merchant'));
    expect(
      await screen.findByText(/Merchant address invalid/),
    ).toBeInTheDocument();
    expect(mockUpdateMerchant).not.toHaveBeenCalled();
  });

  test('shows update merchant error', async () => {
    mockUsePlans.mockReturnValue({ plans: [plan], reload: jest.fn() });
    mockUpdateMerchant.mockRejectedValue(new Error('Transaction failed: fail'));
    render(<Wrapper />);
    await userEvent.selectOptions(screen.getByRole('combobox'), ['0']);
    await userEvent.type(
      screen.getByLabelText('Merchant'),
      '0x' + '1'.repeat(40),
    );
    await userEvent.click(screen.getByText('Update Merchant'));
    expect(await screen.findByText('Transaction failed: fail')).toBeInTheDocument();
  });

  test('disable plan button calls contract', async () => {
    mockUsePlans.mockReturnValue({ plans: [plan], reload: jest.fn() });
    render(<Wrapper />);
    await userEvent.selectOptions(screen.getByRole('combobox'), ['0']);
    await userEvent.click(screen.getByText('Disable Plan'));
    expect(mockDisablePlan).toHaveBeenCalled();
  });
});
