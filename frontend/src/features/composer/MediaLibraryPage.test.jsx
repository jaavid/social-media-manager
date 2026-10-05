import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MediaLibraryPage from './MediaLibraryPage';
import { composerAPI } from '../../services/api';
import { setLanguage } from '../../i18n';
jest.mock('../../services/api', () => ({ composerAPI: { media: { list: jest.fn() } } }));
const assets = [{ id: 1, folder: 'Alpha', alt_text: 'One' }, { id: 2, folder: 'Beta', alt_text: 'Two' }];
beforeEach(() => { jest.clearAllMocks(); window.history.replaceState({}, '', '/admin/analytics/media'); setLanguage('en'); });

test('folder options survive switching between filtered results', async () => {
  composerAPI.media.list.mockImplementation(async params => ({ data: params?.folder ? assets.filter(a => a.folder === params.folder) : assets }));
  render(<MediaLibraryPage />);
  const alpha = await screen.findByRole('option', { name: 'Alpha' });
  const folders = alpha.parentElement;
  fireEvent.change(folders, { target: { value: 'Alpha' } });
  await waitFor(() => expect(composerAPI.media.list).toHaveBeenCalledWith({ folder: 'Alpha' }));
  expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
  fireEvent.change(folders, { target: { value: 'Beta' } });
  await waitFor(() => expect(composerAPI.media.list).toHaveBeenCalledWith({ folder: 'Beta' }));
});

test('API failure is an error with retry, not an empty library', async () => {
  composerAPI.media.list.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: assets });
  render(<MediaLibraryPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load media');
  expect(screen.queryByText('No media yet')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
