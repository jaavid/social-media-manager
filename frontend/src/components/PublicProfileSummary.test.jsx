import { render, screen } from '@testing-library/react';
import PublicProfileSummary from './PublicProfileSummary';
import PublicPostDetails from './calendar/PublicPostDetails';

let mockPersian = false;
jest.mock('@/i18n', () => ({ useLanguage: () => ({ isPersian: mockPersian, formatDate: value => value, formatNumber: value => String(value) }) }));
beforeEach(() => { mockPersian = false; });

test('public metrics preserve zero and mark missing values as unavailable', () => {
  render(<PublicProfileSummary data={{ status: 'partial', profile: { full_name: 'Example', followers: 0, biography: 'Actual bio' },
    profile_fetched_at: '2026-10-29', posts_fetched_at: null,
    sample_metrics: { sample_size: 5, avg_likes: 0, avg_comments: null, engagement_rate: null } }} />);
  expect(screen.getByText('Actual bio')).toBeInTheDocument();
  expect(screen.getByText('Followers').parentElement).toHaveTextContent('0');
  expect(screen.getByText('Following').parentElement).toHaveTextContent('—');
  expect(screen.getByText('Average comments: —')).toBeInTheDocument();
  expect(screen.getByText('Sample engagement rate: —')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Partially collected');
});

test('Persian summary explains retained data on error and filters unsafe links', () => {
  mockPersian = true;
  render(<PublicProfileSummary data={{ status: 'error', profile: { full_name: 'نمونه', external_url: 'javascript:alert(1)' } }} />);
  expect(screen.getByRole('region', { name: 'اطلاعات عمومی پیج' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('اطلاعات قبلی حفظ شده است');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test('public post metadata exposes stored media and tags with safe links', () => {
  render(<PublicPostDetails details={{ location: 'Tehran', hashtags: ['#example'], tagged_users: ['example'],
    photos: ['https://cdn.example/photo.jpg', 'javascript:alert(1)'], videos: ['https://cdn.example/video.mp4'] }} />);
  expect(screen.getByText('Location: Tehran')).toBeInTheDocument();
  expect(screen.getByText('Hashtags: #example')).toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(2);
  expect(screen.getByRole('link', { name: 'Video 1' })).toHaveAttribute('href', 'https://cdn.example/video.mp4');
});
