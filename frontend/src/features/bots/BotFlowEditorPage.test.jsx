import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BotFlowEditorPage from './BotFlowEditorPage';
import { botAPI } from '@/services/api';
let mockId = '1';
jest.mock('nanoid', () => ({ nanoid: () => 'fixture-node' }));
jest.mock('@/core/session', () => ({ useSession: () => ({ user: { id: 1, workspace_id: 7 } }) }));
jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: (key) => key, tr: (value) => value }) }));
jest.mock('../../core/navigation', () => ({
  useAppNavigate: () => jest.fn(),
  useAppParams: () => ({ id: mockId }),
}));
jest.mock('../../services/api', () => ({
  botAPI: { get: jest.fn(), update: jest.fn(), validate: jest.fn(), unpublish: jest.fn() },
}));
jest.mock('reactflow', () => ({
  __esModule: true,
  default: function MockReactFlow({ children }) {
    return <div>{children}</div>;
  },
  ReactFlowProvider: ({ children }) => children,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  MarkerType: { ArrowClosed: 'closed' },
  useReactFlow: () => ({ fitView: jest.fn() }),
  applyNodeChanges: (_, rows) => rows,
  applyEdgeChanges: (_, rows) => rows,
  addEdge: (edge, rows) => [...rows, edge],
}));
jest.mock('../../components/bot/NodeInspector', () => () => null);
jest.mock('../../components/bot/TestModeDrawer', () => () => null);
jest.mock(
  '../../components/bot/TriggerConfigModal',
  () =>
    function MockPublishConfirmation() {
      return <div>Publish confirmation</div>;
    },
);
const flow = (id = 1, name = 'Original') => ({ id, name, nodes: [], edges: [], is_active: false });
beforeEach(() => {
  jest.clearAllMocks();
  mockId = '1';
  botAPI.get.mockResolvedValue({ data: flow() });
});
test('save failure preserves input, blocks publish and stops automatic replay', async () => {
  botAPI.update.mockRejectedValue(new Error('private upstream contents'));
  render(<BotFlowEditorPage />);
  const input = await screen.findByLabelText('editor.flowName');
  fireEvent.change(input, { target: { value: 'Keep this draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  expect(input).toHaveValue('Keep this draft');
  expect(screen.queryByText('Publish confirmation')).not.toBeInTheDocument();
  expect(screen.queryByText('private upstream contents')).not.toBeInTheDocument();
  expect(botAPI.update).toHaveBeenCalledTimes(1);
});
test('late save cannot erase newer edits or claim those edits saved', async () => {
  let finish;
  botAPI.update.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<BotFlowEditorPage />);
  const input = await screen.findByLabelText('editor.flowName');
  fireEvent.change(input, { target: { value: 'Submitted' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  fireEvent.change(input, { target: { value: 'Newer private draft' } });
  await act(async () => finish({ data: flow(1, 'Submitted') }));
  expect(input).toHaveValue('Newer private draft');
  expect(screen.getByText('Unsaved')).toBeInTheDocument();
});
test('switching editor identity rejects an obsolete initial response', async () => {
  let finish;
  botAPI.get.mockImplementation((id) =>
    id === '1'
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve({ data: flow(2, 'Second') }),
  );
  const view = render(<BotFlowEditorPage />);
  mockId = '2';
  view.rerender(<BotFlowEditorPage />);
  await screen.findByDisplayValue('Second');
  await act(async () => finish({ data: flow(1, 'Old private content') }));
  expect(screen.queryByDisplayValue('Old private content')).not.toBeInTheDocument();
});
