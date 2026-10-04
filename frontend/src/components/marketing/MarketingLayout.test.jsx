import { fireEvent, render, screen, within } from '@testing-library/react';
import MarketingLayout from './MarketingLayout';

jest.mock('../ui/ThemeToggle', () => () => <button>Theme</button>);

function mount(width = 1440) {
  window.innerWidth = width;
  return render(<MarketingLayout><button>Page content</button></MarketingLayout>);
}

beforeEach(() => { document.body.style.overflow = ''; });

test('desktop dropdown supports click toggling and outside dismissal', () => {
  mount();
  const trigger = screen.getByRole('button', { name: 'محصول' });
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(document.getElementById('mkt-product')).toHaveStyle({ background: 'var(--surface-elevated)' });
  fireEvent.click(trigger);
  expect(document.getElementById('mkt-product')).toBeNull();
  fireEvent.mouseEnter(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Page content' }));
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('keyboard opening and Escape return focus to the trigger', () => {
  mount();
  const trigger = screen.getByRole('button', { name: 'راهکارها' });
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
});

test('tablet drawer aligns below the header and unlocks scrolling on resize', () => {
  mount(1024);
  fireEvent.click(screen.getByRole('button', { name: 'باز کردن منو' }));
  expect(screen.getByRole('dialog', { name: 'منوی اصلی' })).toHaveStyle({ top: '64px' });
  expect(document.body.style.overflow).toBe('hidden');
  window.innerWidth = 1440;
  fireEvent(window, new Event('resize'));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).toBe('');
  expect(screen.getByRole('button', { name: 'محصول' })).toBeInTheDocument();
});

test('Persian resource labels preserve dropdown identity and keyboard focus', () => {
  mount();
  const trigger = screen.getByRole('button', { name: 'منابع' });
  expect(trigger).toHaveAttribute('aria-controls', 'mkt-resources');
  fireEvent.click(trigger);
  expect(document.getElementById('mkt-resources')).toBeVisible();
  expect(within(document.getElementById('mkt-resources')).getByRole('link', { name: /مرکز راهنما/ })).toBeVisible();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(trigger).toHaveFocus();
});
