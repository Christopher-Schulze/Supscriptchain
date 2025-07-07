import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../lib/ThemeToggle';

beforeEach(() => {
  localStorage.setItem('theme', 'light');
  document.documentElement.className = '';
});

test('toggles theme and stores preference', async () => {
  render(<ThemeToggle />);
  expect(document.documentElement.classList.contains('light')).toBe(true);
  expect(screen.getByRole('button').textContent).toBe('Dark');
  await userEvent.click(screen.getByRole('button'));
  await waitFor(() =>
    expect(document.documentElement.classList.contains('dark')).toBe(true),
  );
  expect(screen.getByRole('button').textContent).toBe('Light');
  expect(localStorage.getItem('theme')).toBe('dark');
});
