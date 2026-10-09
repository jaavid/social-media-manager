import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Brand Voice", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/brand-voice", true);
import View from '../analytics/brand-voice/View.jsx';
export default function Page() { return <View />; }
