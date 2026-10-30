import { render, screen } from '@testing-library/react';
import ROIFunnel from './ROIFunnel';
import StatCard from './StatCard';

jest.mock('../../services/platforms', () => ({ fmt: n => String(n) }));

test('funnel styling uses semantic stage colors and keeps numeric proportions', () => {
  const { container } = render(<ROIFunnel clicks={100} website_clicks={80} leads={20} sales={5} />);
  expect(screen.getByText('Total Clicks')).toBeInTheDocument();
  expect(screen.getByText('Conversions')).toBeInTheDocument();
  const stages = [...container.querySelectorAll('.roi-funnel__stage')];
  expect(stages).toHaveLength(4);
  expect(stages[0].style.getPropertyValue('--roi-stage-color')).toBe('var(--module-messaging)');
  expect(stages[2].querySelector('.roi-funnel__block').style.getPropertyValue('--roi-stage-width')).toBe('72%');
  expect(screen.getAllByText('25%')).toHaveLength(2);
});

test('statistics cards accept legacy color aliases but paint with the shared theme', () => {
  const { container } = render(<StatCard label="Reach" value={100} color="#00CCF5" trend={10} />);
  expect(screen.getByText('Reach')).toBeInTheDocument();
  expect(container.querySelector('.ds-statcard__icon').style.getPropertyValue('--stat-accent')).toBe('var(--brand-primary)');
  expect(container.querySelector('[data-positive="true"]')).toBeInTheDocument();
  expect(container.querySelector('style')).toBeNull();
});
