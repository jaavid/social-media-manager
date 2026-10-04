import MarketingLayout from '../components/marketing/MarketingLayout';
import NotFoundView from './NotFoundView';
export const metadata = { title: 'صفحه پیدا نشد', robots: { index: false, follow: false } };
export default function NotFound() { return <MarketingLayout><NotFoundView /></MarketingLayout>; }
