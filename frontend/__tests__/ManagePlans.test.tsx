import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManagePlans from '../app/plans/manage/page';
import { usePlans } from '../lib/plansStore';
import { StoreProvider } from '../lib/store';
import { updatePlan } from '../lib/contract';

jest.mock('../lib/plansStore');
jest.mock('../lib/contract', () => ({ updatePlan: jest.fn() }));
jest.mock('../lib/useWallet', () => () => ({ account: '0xabc', connect: jest.fn() }));

const mockUsePlans = usePlans as jest.Mock;
const mockUpdate = updatePlan as jest.Mock;

function Wrapper() {
  return (
    <StoreProvider>
      <ManagePlans />
    </StoreProvider>
  );
}

describe('ManagePlans page', () => {
  test('validates billing input', async () => {
    mockUsePlans.mockReturnValue({ plans: [{}], reload: jest.fn() });
    render(<Wrapper />);
    await userEvent.selectOptions(screen.getByRole('combobox'), ['0']);
    await userEvent.click(screen.getByText('Update'));
    expect(await screen.findByText('billing > 0')).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
