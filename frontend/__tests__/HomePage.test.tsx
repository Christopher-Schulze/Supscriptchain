import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home page', () => {
  test('contains navigation links', () => {
    render(<Home />);
    expect(screen.getByText('Plan Overview')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });
});
