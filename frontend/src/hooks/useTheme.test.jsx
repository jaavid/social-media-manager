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
