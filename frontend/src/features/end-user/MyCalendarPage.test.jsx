import { render, screen } from '@testing-library/react';
import CalendarPage from '@/features/CalendarPage';
import MyCalendarPage from './MyCalendarPage';

let mockWorkspaceId = 10;
jest.mock('@/hooks/useWorkspaceScope', () => ({
  __esModule: true, default: () => ({ workspaceId: mockWorkspaceId }),
}));
jest.mock('@/hooks/useData', () => ({
  useWorkspaces: () => ({
    workspaces: [{ id: 10, company: 'Brand A' }, { id: 11, company: 'Brand B' }],
    loading: false,
  }),
}));
jest.mock('@/i18n', () => ({
  useLanguage: () => ({ isPersian: false, t: (key, fallback) => fallback }),
}));
jest.mock('@/features/CalendarPage', () => ({
  __esModule: true,
  default: ({ clientId }) => <div data-testid="calendar">{clientId}</div>,
}));

beforeEach(() => { mockWorkspaceId = 10; });
test('uses the global workspace scope without a duplicate selector', () => {
  const view = render(<MyCalendarPage CalendarView={CalendarPage} />);
  expect(screen.getByTestId('calendar')).toHaveTextContent('10');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  mockWorkspaceId = 11;
  view.rerender(<MyCalendarPage CalendarView={CalendarPage} />);
  expect(screen.getByTestId('calendar')).toHaveTextContent('11');
});
test('does not mount calendar for an inaccessible workspace', () => {
  mockWorkspaceId = 99;
  render(<MyCalendarPage CalendarView={CalendarPage} />);
  expect(screen.queryByTestId('calendar')).not.toBeInTheDocument();
  expect(screen.getByText(/Choose an accessible workspace/)).toBeInTheDocument();
});
