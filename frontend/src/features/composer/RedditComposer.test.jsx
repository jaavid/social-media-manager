import { fireEvent, render, screen } from '@testing-library/react';
import RedditComposer from './RedditComposer';
import { composerExtensions } from './composerExtensions';

jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: key => key, tr: value => value }) }));
jest.mock('./TelegramComposer', () => ({ __esModule: true, default: () => null, emptyRich: {}, RichPreview: () => null }));

test('editing Reddit options preserves account selection and other extensions', () => {
  const value = { account_targets: [{ social_account_id: 12 }], extensions: { reddit: { title: 'Old', nsfw: true }, preserved: {} } };
  const onChange = jest.fn();
  render(<RedditComposer value={value} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText('reddit.title'), { target: { value: 'New title' } });
  expect(onChange).toHaveBeenCalledWith({ extensions: { reddit: { title: 'New title', nsfw: true }, preserved: {} } });
  expect(composerExtensions.reddit_composer.prepare('text', value)).toEqual(value);
});

test('link, flair and explicit flags are editable', () => {
  const onChange = jest.fn();
  render(<RedditComposer value={{}} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText('reddit.url'), { target: { value: 'https://example.com/story' } });
  expect(onChange).toHaveBeenLastCalledWith({ extensions: { reddit: { url: 'https://example.com/story' } } });
  fireEvent.click(screen.getByLabelText('reddit.spoiler'));
  expect(onChange).toHaveBeenLastCalledWith({ extensions: { reddit: { spoiler: true } } });
});

test('Reddit preview safely renders saved title and link as text', () => {
  const Preview = composerExtensions.reddit_composer.Preview;
  render(<Preview value={{ extensions: { reddit: { title: '<script>title</script>', url: 'https://example.com' } } }} />);
  expect(screen.getByRole('heading')).toHaveTextContent('<script>title</script>');
  expect(screen.getByText('https://example.com')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
});
