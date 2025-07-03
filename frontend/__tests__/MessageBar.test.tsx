import { render, screen } from '@testing-library/react';
import { StoreProvider, useStore } from '../lib/store';
import MessageBar from '../lib/MessageBar';
import userEvent from '@testing-library/user-event';

test('shows and hides message', async () => {
  function Wrapper() {
    const { setMessage } = useStore();
    return (
      <div>
        <button onClick={() => setMessage('hello')}>set</button>
        <MessageBar />
      </div>
    );
  }
  render(
    <StoreProvider>
      <Wrapper />
    </StoreProvider>
  );
  await userEvent.click(screen.getByText('set'));
  expect(screen.getByText('hello')).toBeInTheDocument();
  await userEvent.click(screen.getByText('hello'));
  expect(screen.queryByText('hello')).toBeNull();
});
