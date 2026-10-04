import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("System Status", "Live uptime, scheduled maintenance, and recent incidents for the Social Stats platform.", "/status", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
