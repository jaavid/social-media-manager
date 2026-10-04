import HomePage from '@/features/HomePage';
import ReturningUserRedirect from '@/components/marketing/ReturningUserRedirect';
import { publicMetadata } from '../../lib/metadata.mjs';
export const metadata = publicMetadata("Social Stats — The marketing OS for modern teams", "Manage analytics, content, conversations, and ads across your workspaces.", "/", false);
export default function Page() { return <><HomePage /><ReturningUserRedirect /></>; }
