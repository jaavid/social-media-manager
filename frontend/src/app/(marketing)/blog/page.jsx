import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("Blog", "Product updates, agency playbooks, AI experiments, and design decisions from the team building Social Stats.", "/blog", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
