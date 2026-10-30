import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme, bootstrapTheme } from './useTheme';
afterEach(() => localStorage.clear());
it('persists a theme chosen through the provider and restores it before paint', () => {
  function Control() { const { setTheme } = useTheme(); return <button onClick={() => setTheme('dark')}>Dark</button>; }
  render(<ThemeProvider><Control /></ThemeProvider>);
  fireEvent.click(screen.getByText('Dark'));
  expect(localStorage.getItem('theme')).toBe('dark');
  bootstrapTheme();
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});

it('system preference keeps the browser dark palette during hydration', () => {
  window.matchMedia = jest.fn(() => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  document.documentElement.dataset.preference = 'system';
  bootstrapTheme();
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});
