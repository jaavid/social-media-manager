import { fireEvent, render, screen } from '@testing-library/react';
import MyCalendarPage from './MyCalendarPage';

let mockWorkspaceId = 10;
const mockSelect = jest.fn();
jest.mock('@/hooks/useWorkspaceScope', () => ({ __esModule: true, default: () => ({ workspaceId: mockWorkspaceId, selectWorkspace: mockSelect }) }));
jest.mock('@/hooks/useData', () => ({ useWorkspaces: () => ({ workspaces: [{ id: 10, company: 'Brand A' }, { id: 11, company: 'Brand B' }], loading: false }) }));
jest.mock('@/i18n', () => ({ useLanguage: () => ({ isPersian: false, t: (key, fallback) => fallback, tr: value => value }) }));
jest.mock('@/features/CalendarPage', () => ({ __esModule: true, default: ({ clientId }) => <div data-testid="calendar">{clientId}</div> }));

beforeEach(() => { mockWorkspaceId = 10; mockSelect.mockClear(); });
test('opens the authorized brand calendar and switches workspace scope', () => {
  const view = render(<MyCalendarPage />);
  expect(screen.getByTestId('calendar')).toHaveTextContent('10');
  fireEvent.change(screen.getByLabelText('Brand / workspace'), { target: { value: '11' } });
  expect(mockSelect).toHaveBeenCalledWith('11');
  mockWorkspaceId = 11;
  view.rerender(<MyCalendarPage />);
  expect(screen.getByTestId('calendar')).toHaveTextContent('11');
});
test('does not mount a calendar for an inaccessible explicit brand', () => {
  mockWorkspaceId = 99;
  render(<MyCalendarPage />);
  expect(screen.queryByTestId('calendar')).not.toBeInTheDocument();
});
