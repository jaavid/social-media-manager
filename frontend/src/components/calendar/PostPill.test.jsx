import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostPill from './PostPill';

jest.mock('../../services/platforms', () => ({
  PLATFORMS: { telegram: { color: '#0088cc', label: 'Telegram' } },
}));
jest.mock('../ui/SocialPlatformIcon', () => ({
  __esModule: true,
  default: () => null,
}));

test('keyboard activation of calendar post preserves the original trigger without opening the date cell', async () => {
  const openPost = jest.fn();
  const openDay = jest.fn();
  render(
    <div onClick={openDay}>
      <PostPill
        post={{ id: 19, platform: 'telegram', status: 'draft', title: 'Keyboard fixture' }}
        onClick={openPost}
      />
    </div>,
  );
  const trigger = screen.getByRole('button', { name: 'Keyboard fixture' });
  await userEvent.tab();
  expect(trigger).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(openPost).toHaveBeenCalledWith(expect.objectContaining({ id: 19 }), trigger);
  expect(openDay).not.toHaveBeenCalled();
});
