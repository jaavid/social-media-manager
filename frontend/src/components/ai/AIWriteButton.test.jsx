import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AIWriteButton from './AIWriteButton';
import { aiV2API } from '@/services/domains/intelligence';
import toast from '../ui/toast';

jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: key => key }) }));
jest.mock('@/services/domains/intelligence', () => ({ aiV2API: { compose: jest.fn() } }));
jest.mock('../ui/toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));
jest.mock('../ui/Button', () => function MockButton({ children, loading, ...props }) {
  const validProps = Object.fromEntries(Object.entries(props).filter(([key]) =>
    !['icon', 'variant', 'size', 'fullWidth', 'iconOnly'].includes(key)));
  return <button type="button" {...validProps} disabled={validProps.disabled || loading}>{children || 'Close'}</button>;
});

function compose(topic = 'Topic') {
  fireEvent.click(screen.getByRole('button', { name: 'AI' }));
  fireEvent.change(screen.getByPlaceholderText(/Summer collection/), { target: { value: topic } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
}
beforeEach(() => {
  jest.resetAllMocks();
});
test('completed proposal inserts into draft only; no publish endpoint or automatic send', async () => {
  aiV2API.compose.mockResolvedValue({ data: { variants: [{ content: 'A draft', hashtags: ['#safe'] }] } });
  const onInsert = jest.fn();
  render(<AIWriteButton clientId={7} label="AI" onInsert={onInsert} />);
  compose();
  await screen.findByRole('button', { name: 'Insert' });
  fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
  expect(onInsert).toHaveBeenCalledWith('A draft\n\n#safe');
  expect(aiV2API.compose).toHaveBeenCalledTimes(1);
  expect(toast.success).toHaveBeenCalledWith('ai.compose.inserted');
});
test.each([
  { data: { done: false, variants: [{ content: 'partial' }] } },
  { data: { status: 'generating', variants: [{ content: 'partial' }] } },
  { data: { variants: [{ content: '' }] } },
  { data: { variants: 'not an array' } },
])('an incomplete or malformed AI output is never offered as a draft', async payload => {
  aiV2API.compose.mockResolvedValue(payload);
  const onInsert = jest.fn();
  render(<AIWriteButton clientId={7} label="AI" onInsert={onInsert} />);
  compose();
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Insert' })).not.toBeInTheDocument();
  expect(onInsert).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
test('late generation from a previous workspace cannot be inserted or celebrated', async () => {
  let release;
  aiV2API.compose.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  const onInsert = jest.fn();
  const view = render(<AIWriteButton clientId={7} label="AI" onInsert={onInsert} />);
  compose();
  view.rerender(<AIWriteButton clientId={8} label="AI" onInsert={onInsert} />);
  await act(async () => { release({ data: { variants: [{ content: 'Private workspace 7 text' }] } }); });
  expect(screen.queryByText('Private workspace 7 text')).not.toBeInTheDocument();
  expect(onInsert).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
test('AI quota error does not change the draft, or claim success', async () => {
  aiV2API.compose.mockRejectedValue({ response: { status: 429 } });
  const onInsert = jest.fn();
  render(<AIWriteButton clientId={7} label="AI" onInsert={onInsert} />);
  compose();
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('ai.compose.limit'));
  expect(onInsert).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Insert' })).not.toBeInTheDocument();
});
test('failed draft insertion does not claim success', async () => {
  aiV2API.compose.mockResolvedValue({ data: { variants: [{ content: 'Valid draft' }] } });
  const onInsert = jest.fn(() => { throw Error('read-only'); });
  render(<AIWriteButton clientId={7} label="AI" onInsert={onInsert} />);
  compose();
  const insert = await screen.findByRole('button', { name: 'Insert' });
  fireEvent.click(insert);
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith('ai.compose.insertionFailed');
});

test('closing during an in-flight generation and reopening clears pending state', async () => {
  let release;
  aiV2API.compose.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  const onInsert = jest.fn();
  render(<AIWriteButton clientId={7} label="AI" onInsert={onInsert} />);
  compose();
  expect(screen.getByRole('button', { name: /Ravinta is writing/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'AI' }));
  expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled();
  await act(async () => { release({ data: { variants: [{ content: 'old result' }] } }); });
  expect(screen.queryByText('old result')).not.toBeInTheDocument();
  expect(onInsert).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
test('closing a completed proposal does not show it again when reopening', async () => {
  aiV2API.compose.mockResolvedValue({ data: { variants: [{ content: 'previous result' }] } });
  render(<AIWriteButton clientId={7} label="AI" onInsert={jest.fn()} />);
  compose();
  await screen.findByText('previous result');
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'AI' }));
  expect(screen.queryByText('previous result')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Insert' })).not.toBeInTheDocument();
});
