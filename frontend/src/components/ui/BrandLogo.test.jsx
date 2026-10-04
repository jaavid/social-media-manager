import { render, screen } from '@testing-library/react';
import Logo from './Logo';

describe('Ravinta logo', () => {
  it('renders the canonical three-path mark geometry', () => {
    const { container } = render(<Logo variant="mark" size={48} />);
    const mark = screen.getByRole('img', { name: 'Ravinta' });

    expect(mark).toHaveAttribute('viewBox', '0 0 96 96');
    expect(container.querySelectorAll('rect')).toHaveLength(3);
    expect(container.querySelector('rect[x="12"][y="42"][width="72"]')).toBeInTheDocument();
  });

  it('uses the approved uppercase Latin wordmark', () => {
    render(<Logo variant="horizontal" />);

    expect(screen.getByText('RAVINTA')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Ravinta' })).toHaveLength(2);
  });

  it('uses the signal color for the inverted mark', () => {
    const { container } = render(<Logo variant="mark-inverted" />);

    expect(container.querySelector('g')).toHaveAttribute('fill', '#D6F268');
  });
});
