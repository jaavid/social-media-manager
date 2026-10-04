import { render, screen, fireEvent } from '@testing-library/react';
import TelegramComposer, { RichPreview } from './TelegramComposer';
import { setLanguage } from '../i18n';

beforeEach(() => {
  // The editor lives in the authenticated workspace, whose locale remains selectable.
  window.history.replaceState({}, '', '/dashboard');
  setLanguage('en');
});

test('Rich preview preserves RTL and distinguishes slideshow from an album', () => {
  render(<RichPreview value={{ is_rtl: true, blocks: [{ type: 'heading', text: 'عنوان' }, { type: 'slideshow', blocks: [] }] }} />);
  expect(screen.getByText('عنوان').closest('[dir]')).toHaveAttribute('dir', 'rtl');
  expect(screen.getByText(/slideshow/)).toBeVisible();
});

test('editor creates structured blocks and keeps reorder deterministic', () => {
  const change = jest.fn();
  render(<TelegramComposer mode="rich" value={{ rich_message: { is_rtl: true, blocks: [{ type: 'heading', text: 'first', size: 2 }, { type: 'paragraph', text: 'second' }] } }} onChange={change} />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Move up' })[1]);
  expect(change.mock.calls[0][0].rich_message.blocks.map(b => b.text)).toEqual(['second', 'first']);
  fireEvent.change(screen.getByLabelText('New block type'), { target: { value: 'slideshow' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
  const block = change.mock.calls[1][0].rich_message.blocks.at(-1);
  expect(block.type).toBe('slideshow');
  expect(block.blocks).toHaveLength(2);
});

test('poll editor emits ordered answer payload without changing platform content', () => {
  const change = jest.fn();
  render(<TelegramComposer mode="poll" value={{}} onChange={change} />);
  fireEvent.change(screen.getByLabelText('Poll answers'), { target: { value: 'first\nsecond\nthird' } });
  expect(change.mock.calls[0][0].poll.options).toEqual(['first', 'second', 'third']);
});
