import { render, screen } from '@testing-library/react';
import { StoreProvider, useStore } from '../lib/store';
import MessageBar from '../lib/MessageBar';
import userEvent from '@testing-library/user-event';

test('shows and hides message', async () => {
  function Wrapper() {
    const { setMessage } = useStore();
    return (
      <div>
        <button onClick={() => setMessage({ text: 'hello', type: 'success' })}>set</button>
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
  const bar = screen.getByText('hello');
  expect(bar).toBeInTheDocument();
  expect(bar.className).toContain('success');
  await userEvent.click(bar);
  expect(screen.queryByText('hello')).toBeNull();
});
