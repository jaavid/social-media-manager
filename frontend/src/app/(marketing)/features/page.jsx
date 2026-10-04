import MarketingLayout from '@/components/marketing/MarketingLayout';
import Content from '@/features/FeaturesPage';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("Features", "Cross-platform analytics, AI-powered composer, unified inbox, automations, white-label reports, granular team permissions — every workflow your agency needs in one platform.", "/features", false);
export default function Page() { return <MarketingLayout><Content /></MarketingLayout>; }
