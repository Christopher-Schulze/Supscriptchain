import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreatePlan from '../app/plans/create/page';
import { StoreProvider } from '../lib/store';
jest.mock('../lib/contract', () => ({
  createPlan: jest.fn(),
}));

function Wrapper() {
  return (
    <StoreProvider>
      <CreatePlan />
    </StoreProvider>
  );
}

test('shows validation errors', async () => {
  render(<Wrapper />);
  await userEvent.click(screen.getByText('Create'));
  expect(screen.getByText(/Token address invalid/)).toBeInTheDocument();
});

test('validates merchant address', async () => {
  render(<Wrapper />);
  await userEvent.type(screen.getByLabelText('Merchant'), 'foo');
  await userEvent.type(screen.getByLabelText('Token'), '0x1111111111111111111111111111111111111111');
  await userEvent.type(screen.getByLabelText('Billing (seconds)'), '1');
  await userEvent.type(screen.getByLabelText('Token Price'), '1');
  await userEvent.click(screen.getByText('Create'));
  expect(screen.getByText(/Merchant address invalid/)).toBeInTheDocument();
});

test('validates billing cycle', async () => {
  render(<Wrapper />);
  await userEvent.type(screen.getByLabelText('Token'), '0x1111111111111111111111111111111111111111');
  await userEvent.type(screen.getByLabelText('Billing (seconds)'), '0');
  await userEvent.type(screen.getByLabelText('Token Price'), '1');
  await userEvent.click(screen.getByText('Create'));
  expect(screen.getByText(/Billing cycle must be > 0/)).toBeInTheDocument();
});
