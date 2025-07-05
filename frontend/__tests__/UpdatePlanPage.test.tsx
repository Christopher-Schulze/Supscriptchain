import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdatePlan from '../app/plans/update/page';
import { StoreProvider } from '../lib/store';
import { updatePlan } from '../lib/contract';

jest.mock('../lib/contract', () => ({ updatePlan: jest.fn() }));
jest.mock('../lib/useWallet', () => () => ({ account: '0xabc', connect: jest.fn() }));

const mockUpdate = updatePlan as jest.Mock;

function Wrapper() {
  return (
    <StoreProvider>
      <UpdatePlan />
    </StoreProvider>
  );
}

describe('UpdatePlan page', () => {
  test('validates plan id', async () => {
    render(<Wrapper />);
    await userEvent.type(screen.getByLabelText('Billing (seconds)'), '1');
    await userEvent.type(screen.getByLabelText('Token Price'), '1');
    await userEvent.click(screen.getByText('Update'));
    expect(await screen.findByText('plan id required')).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
