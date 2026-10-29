import { fireEvent, render, screen } from '@testing-library/react';
import CalendarPage from './CalendarPage';
import { useCalendarPosts } from '@/hooks/useCalendar';

let mockUser;
let mockParams;
const mockSearch = jest.fn();
jest.mock('@/core/navigation', () => ({ useAppSearchParams: () => [mockParams, mockSearch] }));
jest.mock('@/core/session', () => ({ useSession: () => ({ user: mockUser }) }));
jest.mock('@/hooks/useData', () => ({ useWorkspaces: () => ({ workspaces: [{ id: 10, company: 'Brand A' }] }) }));
jest.mock('@/services/platforms', () => ({ PLATFORMS: {}, usePlatformUiRegistry: () => ({ platforms: [] }) }));
jest.mock('@/i18n', () => ({ useLanguage: () => ({ isPersian: false, language: 'en',
  t: (key, fallback) => fallback || key, tr: value => value, formatDate: String, formatNumber: String }) }));
jest.mock('@/hooks/useCalendar', () => ({
  useCalendarPosts: jest.fn(() => ({ postsByDate: {}, loading: false, refetch: jest.fn() })),
  useCalendarStats: () => ({ stats: {} }), useCalendarNotes: () => ({ notesByDate: {} }),
  useUpcomingPosts: () => ({ upcoming: [] }), useCreatePost: () => ({}),
}));
jest.mock('@/components/calendar/ChannelSources', () => ({ __esModule: true,
  default: ({ selectedSource, onSelectSource }) => <button onClick={() => onSelectSource('2')}>Filter:{selectedSource || 'all'}</button> }));
jest.mock('@/components/calendar/CalendarGrid', () => ({ __esModule: true, default: () => <div>Month grid</div> }));
jest.mock('@/components/calendar/CalendarStats', () => ({ __esModule: true, default: () => <div>Stats panel</div> }));
jest.mock('@/components/calendar/PostDrawer', () => ({ __esModule: true, default: ({ isOpen, post, onEdit, returnFocusRef }) => isOpen ? <div><span data-testid="details-return-target">{returnFocusRef.current?.textContent}</span><button onClick={() => onEdit(post)}>Edit inside details</button></div> : null }));
jest.mock('@/components/calendar/PostFormDrawer', () => ({ __esModule: true, default: ({ isOpen, returnFocusRef }) => isOpen ? <span data-testid="editor-return-target">{returnFocusRef.current?.textContent}</span> : null }));
jest.mock('@/components/layout/PageHeader', () => ({ __esModule: true, default: ({ actions }) => <header>{actions}</header> }));

beforeEach(() => {
  mockUser = { role: 'user', client_id: 10 };
  mockParams = new URLSearchParams();
  jest.clearAllMocks();
});

test('late session data selects its workspace and embedded scope overrides query scope', () => {
  mockUser = null;
  const view = render(<CalendarPage />);
  expect(useCalendarPosts.mock.lastCall[0]).toBeNull();
  mockUser = { role: 'user', client_id: 10 };
  view.rerender(<CalendarPage />);
  expect(useCalendarPosts.mock.lastCall[0]).toBe(10);
  mockParams = new URLSearchParams('client=99');
  view.rerender(<CalendarPage clientId={7} />);
  expect(useCalendarPosts.mock.lastCall[0]).toBe(7);
});

test('URL navigation updates workspace and view and clears the channel filter on each scope change', () => {
  mockParams = new URLSearchParams('client=10&view=month');
  const view = render(<CalendarPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Filter:all' }));
  expect(screen.getByRole('button', { name: 'Filter:2' })).toBeInTheDocument();
  mockParams = new URLSearchParams('client=11&view=stats');
  view.rerender(<CalendarPage />);
  expect(useCalendarPosts.mock.lastCall[0]).toBe(11);
  expect(screen.getByText('Stats panel')).toBeInTheDocument();
  expect(screen.queryByText('Month grid')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Filter:all' })).toBeInTheDocument();
  mockParams = new URLSearchParams('client=10&view=month');
  view.rerender(<CalendarPage />);
  expect(screen.getByRole('button', { name: 'Filter:all' })).toBeInTheDocument();
  expect(screen.getByText('Month grid')).toBeInTheDocument();
});

test('admin can clear the workspace and view buttons update URL state', () => {
  mockUser = { role: 'superadmin' };
  mockParams = new URLSearchParams('client=10');
  const view = render(<CalendarPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Stats' }));
  expect(mockSearch.mock.lastCall[0].get('view')).toBe('stats');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
  expect(mockSearch.mock.lastCall[0].has('client')).toBe(false);
  mockParams = new URLSearchParams();
  view.rerender(<CalendarPage />);
  expect(useCalendarPosts.mock.lastCall[0]).toBeNull();
  expect(screen.getByText('Select a user from the top-right dropdown to view their content calendar.')).toBeInTheDocument();
});

test('calendar details → editor retain the original View trigger for focus restoration', () => {
  mockUser = { role: 'staff' };
  mockParams = new URLSearchParams('client=10&view=list');
  const today = new Date();
  const dateKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  useCalendarPosts.mockImplementation(() => ({
    postsByDate: { [dateKey]: [{ id: 19, platform: 'telegram', status: 'draft', title: 'Trigger fixture', caption: 'Calendar post' }] },
    loading: false,
    refetch: jest.fn(),
  }));
  render(<CalendarPage />);
  const trigger = screen.getByRole('button', { name: 'View' });
  fireEvent.click(trigger);
  expect(screen.getByTestId('details-return-target')).toHaveTextContent('View');
  fireEvent.click(screen.getByRole('button', { name: 'Edit inside details' }));
  expect(screen.getByTestId('editor-return-target')).toHaveTextContent('View');
});
