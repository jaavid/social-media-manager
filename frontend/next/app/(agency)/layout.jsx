import { Guard } from '../Guard';
export const metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }) { return <Guard roles={["client"]} accountTypes={["agency_member"]}>{children}</Guard>; }
