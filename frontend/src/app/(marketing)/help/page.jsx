import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("Help Center", "Setup guides, troubleshooting steps, FAQs, and answers to common questions about using Social Stats.", "/help", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
