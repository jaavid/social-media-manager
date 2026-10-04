import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("Partner Agencies — Social Stats", "Find a verified marketing agency built on Social Stats. 50+ partner agencies across India, vetted for compliance, capability, and customer outcomes.", "/agencies", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
