import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfileSettings, { parseProfile } from './ProfileSettings';
import { profileAPI } from '@/services/domains/identity';
import { QK } from '@/services/queryClient';
import { enMessages as mockMessages } from '@/i18n/messages';
jest.mock('@/services/domains/identity', () => ({
  profileAPI: { get: jest.fn(), update: jest.fn() },
}));
jest.mock('@/i18n', () => ({
  useLanguage: () => ({ t: (key) => mockMessages[key], tr: (value) => value, isPersian: false }),
}));
const user = { id: 1, role: 'staff', account_type: 'legacy', workspace_id: 7 };
const profile = {
  id: 1,
  first_name: 'First',
  last_name: 'Last',
  avatar: '/photo.png',
  email: 'fixture@example.test',
};
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const root = (next) => (
    <QueryClientProvider client={client}>
      <ProfileSettings user={next} />
    </QueryClientProvider>
  );
  const view = render(root(user));
  return { client, ...view, switch: (next) => view.rerender(root(next)) };
}
beforeEach(() => {
  jest.resetAllMocks();
  profileAPI.get.mockResolvedValue({ data: profile });
  URL.createObjectURL = jest.fn(() => 'blob:photo');
  URL.revokeObjectURL = jest.fn();
});
test('malformed wire data is never a successful profile', () => {
  for (const data of [
    null,
    {},
    { ...profile, id: 2 },
    { ...profile, avatar: 'javascript:secret' },
    { ...profile, first_name: null },
  ])
    expect(() => parseProfile(data, 1)).toThrow();
  expect(parseProfile(profile, 1)).toEqual(profile);
});
for (const status of [403, 404, 429, 503])
  test(`initial ${status} does not invent editable profile; retry recovers`, async () => {
    profileAPI.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status, data: { error: 'raw-secret' } },
    });
    setup();
    await screen.findByRole('alert');
    expect(screen.queryByLabelText(mockMessages['profile.first'])).toBeNull();
    expect(screen.queryByText('raw-secret')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.retry'] }));
    expect(await screen.findByLabelText(mockMessages['profile.first'])).toHaveValue('First');
  });
test('background failure keeps draft; forbidden hides it', async () => {
  const view = setup();
  const first = await screen.findByLabelText(mockMessages['profile.first']);
  fireEvent.change(first, { target: { value: 'Edited' } });
  profileAPI.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503 } });
  fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.refresh'] }));
  await screen.findByText(mockMessages['profile.refreshFailed']);
  expect(first).toHaveValue('Edited');
  profileAPI.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
  await act(async () =>
    view.client.refetchQueries({ queryKey: QK.profile([1, 'staff', 'legacy'], 7) }),
  );
  await waitFor(() => expect(screen.queryByLabelText(mockMessages['profile.first'])).toBeNull());
});
test('obsolete workspace read is aborted and cannot replace new context', async () => {
  let resolve, signal;
  profileAPI.get.mockImplementationOnce((s) => {
    signal = s;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const view = setup();
  await waitFor(() => expect(profileAPI.get).toHaveBeenCalled());
  view.switch({ ...user, workspace_id: 8 });
  expect(await screen.findByLabelText(mockMessages['profile.first'])).toHaveValue('First');
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: { ...profile, first_name: 'Obsolete' } }));
  expect(screen.getByLabelText(mockMessages['profile.first'])).toHaveValue('First');
});
test('save failure and malformed success preserve input, no auto replay, validated retry updates cache', async () => {
  profileAPI.update
    .mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 503, data: { error: 'raw-secret' } },
    })
    .mockResolvedValueOnce({ data: {} })
    .mockResolvedValueOnce({ data: { first_name: 'Edited', last_name: 'Last', avatar: null } });
  const view = setup();
  const first = await screen.findByLabelText(mockMessages['profile.first']);
  fireEvent.change(first, { target: { value: 'Edited' } });
  for (let i = 0; i < 2; i++) {
    fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.save'] }));
    await screen.findByText(mockMessages['profile.saveFailed']);
    expect(first).toHaveValue('Edited');
    expect(screen.queryByText(mockMessages['profile.saved'])).toBeNull();
    expect(screen.queryByText('raw-secret')).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: mockMessages['profile.save'] })).toBeEnabled(),
    );
  }
  expect(profileAPI.update).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.save'] }));
  await screen.findByText(mockMessages['profile.saved']);
  expect(view.client.getQueryData(QK.profile([1, 'staff', 'legacy'], 7)).first_name).toBe('Edited');
});
test('photo removal confirmation is staged, preserves failed intent, and cancellation restores trigger', async () => {
  profileAPI.update.mockRejectedValueOnce(new Error('private-secret'));
  setup();
  await screen.findByLabelText(mockMessages['profile.first']);
  const trigger = screen.getByRole('button', { name: mockMessages['profile.remove'] });
  trigger.focus();
  fireEvent.click(trigger);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: mockMessages['profile.cancel'] })).toHaveFocus(),
  );
  fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.cancel'] }));
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(profileAPI.update).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.confirmRemove'] }));
  await screen.findByText(mockMessages['profile.removalPending']);
  expect(profileAPI.update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.save'] }));
  await screen.findByText(mockMessages['profile.saveFailed']);
  expect(profileAPI.update.mock.calls[0][0].get('remove_avatar')).toBe('true');
  expect(screen.getByText(mockMessages['profile.removalPending'])).toBeVisible();
});
test('pending save guards duplicates and late result after identity change', async () => {
  let resolve;
  profileAPI.update.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = setup();
  await screen.findByLabelText(mockMessages['profile.first']);
  const button = screen.getByRole('button', { name: mockMessages['profile.save'] });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(profileAPI.update).toHaveBeenCalledTimes(1));
  profileAPI.get.mockResolvedValueOnce({ data: { ...profile, id: 2, first_name: 'Second' } });
  view.switch({ ...user, id: 2 });
  await waitFor(() =>
    expect(screen.getByLabelText(mockMessages['profile.first'])).toHaveValue('Second'),
  );
  await act(async () =>
    resolve({ data: { first_name: 'Obsolete', last_name: 'Old', avatar: null } }),
  );
  expect(screen.getByLabelText(mockMessages['profile.first'])).toHaveValue('Second');
  expect(screen.queryByText(mockMessages['profile.saved'])).toBeNull();
});

test('photo file validation, failed upload and object URL lifecycle preserve recovery', async () => {
  profileAPI.update.mockRejectedValueOnce(new Error('offline'));
  const view = setup();
  await screen.findByLabelText(mockMessages['profile.first']);
  const upload = screen.getByLabelText(mockMessages['profile.upload']);
  fireEvent.change(upload, {
    target: { files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })] },
  });
  expect(screen.getByRole('button', { name: mockMessages['profile.save'] })).toBeDisabled();
  const photo = new File(['photo'], 'photo.png', { type: 'image/png' });
  fireEvent.change(upload, { target: { files: [photo] } });
  await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledWith(photo));
  fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.save'] }));
  await screen.findByText(mockMessages['profile.saveFailed']);
  expect(profileAPI.update.mock.calls[0][0].get('avatar').name).toBe('photo.png');
  expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:photo');
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
});

test('legacy adjacent content remains inside the verified profile boundary', async () => {
  profileAPI.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProfileSettings user={user}>
        <button>Legacy adjacent action</button>
      </ProfileSettings>
    </QueryClientProvider>,
  );
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Legacy adjacent action' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.retry'] }));
  expect(await screen.findByRole('button', { name: 'Legacy adjacent action' })).toBeVisible();
});

for (const savedAvatar of ['/original.png', null])
  test(`discarding an unsaved photo preserves persisted avatar ${savedAvatar}`, async () => {
    profileAPI.get.mockResolvedValueOnce({ data: { ...profile, avatar: savedAvatar } });
    profileAPI.update.mockResolvedValueOnce({
      data: { first_name: 'First', last_name: 'Last', avatar: savedAvatar },
    });
    setup();
    await screen.findByLabelText(mockMessages['profile.first']);
    const upload = screen.getByLabelText(mockMessages['profile.upload']);
    const photo = new File(['photo'], 'draft.png', { type: 'image/png' });
    fireEvent.change(upload, { target: { files: [photo] } });
    await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:photo'));
    fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.discard'] }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByText(mockMessages['profile.removalPending'])).toBeNull();
    expect(profileAPI.update).not.toHaveBeenCalled();
    expect(upload).toHaveFocus();
    expect(upload.value).toBe('');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
    if (savedAvatar) expect(screen.getByRole('img')).toHaveAttribute('src', savedAvatar);
    else expect(screen.queryByRole('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: mockMessages['profile.save'] }));
    await screen.findByText(mockMessages['profile.saved']);
    const body = profileAPI.update.mock.calls[0][0];
    expect(body.has('avatar')).toBe(false);
    expect(body.has('remove_avatar')).toBe(false);
    // Clearing the input also allows the same File to be chosen again.
    fireEvent.change(upload, { target: { files: [photo] } });
    expect(screen.getByRole('button', { name: mockMessages['profile.discard'] })).toBeVisible();
  });
