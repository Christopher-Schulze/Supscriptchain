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
