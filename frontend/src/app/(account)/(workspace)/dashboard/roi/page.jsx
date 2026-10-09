import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("ROICalculator", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/roi", true);
import View from '../analytics/roi/View.jsx';
export default function Page() { return <View />; }
