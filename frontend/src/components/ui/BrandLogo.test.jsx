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

  it('labels the composite once and identifies the provisional text fallback', () => {
    render(<Logo variant="horizontal" />);

    expect(screen.getByText('RAVINTA')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Ravinta' })).toHaveLength(1);
    expect(screen.getByText('RAVINTA')).toHaveAttribute('data-wordmark-status', 'text-fallback');
  });

  it('uses the signal color for the inverted mark', () => {
    const { container } = render(<Logo variant="mark-inverted" />);

    expect(container.querySelector('g')).toHaveAttribute('fill', 'var(--brand-signal, #D6F268)');
  });
});

it('keeps the mark unmirrored in RTL and omits the text fallback below lockup size', () => {
  const { container } = render(<div dir="rtl"><Logo variant="horizontal" height={24} /></div>);
  expect(screen.getAllByRole('img', { name: 'Ravinta' })).toHaveLength(1);
  expect(screen.queryByText('RAVINTA')).not.toBeInTheDocument();
  expect(container.querySelector('svg')).toHaveStyle({ transform: 'none', direction: 'ltr' });
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});
