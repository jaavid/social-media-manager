import { fireEvent, render, screen } from '@testing-library/react';
import LeadsPage from './LeadsPage';
import { setLanguage } from '../../i18n';

jest.mock('../../services/api', () => ({ leadAPI: { list: jest.fn(async () => ({ data: [{ id: 1, name: 'Fixture lead', status: 'new', score: 0 }] })) } }));
jest.mock('../../core/navigation', () => ({ AppLink: ({ children }) => <a>{children}</a> }));
jest.mock('../../components/ui/toast', () => ({ success: jest.fn(), error: jest.fn() }));

test.each([null, 'kanban', 'table', 'invalid'])('Leads opens with stored view %s and persists toggles', async stored => {
  localStorage.clear();
  window.history.replaceState({}, '', '/admin/leads');
  setLanguage('en');
  if (stored) localStorage.setItem('leads_view', stored);
  const { unmount } = render(<LeadsPage />);
  expect(screen.getByRole('heading', { name: /Leads/ })).toBeInTheDocument();
  await screen.findByText('Fixture lead');
  fireEvent.click(screen.getByRole('button', { name: 'Kanban view' }));
  expect(localStorage.getItem('leads_view')).toBe('kanban');
  unmount();
  render(<LeadsPage />);
  await screen.findByText('Fixture lead');
  expect(screen.getAllByText('Qualified').some(element => element.tagName !== 'OPTION')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Table view' }));
  expect(localStorage.getItem('leads_view')).toBe('table');
});
