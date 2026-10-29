import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostDrawer from './PostDrawer';

jest.mock('../../i18n', () => ({
  useLanguage: () => ({
    isPersian: false,
    tr: value => value,
    formatDate: () => 'November 8, 2026',
    formatNumber: value => String(value),
  }),
}));
jest.mock('../../services/platforms', () => ({
  PLATFORMS: { telegram: { color: '#0088cc', label: 'Telegram' } },
}));
jest.mock('../ui/SocialPlatformIcon', () => ({
  __esModule: true,
  default: () => null,
}));

test('post details use the shared named modal, trap focus and restore the trigger on Escape', async () => {
  function Example() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Show post</button>
        <PostDrawer
          post={{ id: 7, platform: 'telegram', status: 'draft', title: 'Draft fixture' }}
          isOpen={open}
          onClose={() => setOpen(false)}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      </>
    );
  }
  render(<Example />);
  const trigger = screen.getByRole('button', { name: 'Show post' });
  await userEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: /Telegram.*Draft/ });
  expect(dialog).toHaveAttribute('dir', 'ltr');
  expect(trigger.closest('[aria-hidden="true"]')).not.toBeNull();
  for (let index = 0; index < 8; index += 1) {
    await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
  }
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
});
