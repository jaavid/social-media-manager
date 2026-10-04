import { authorizeServerRoute } from '../../../lib/auth/server';
import PrivateRuntime from '../../../core/providers/PrivateRuntime';
import { Guard } from '../../Guard';
export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({ children }) {
  await authorizeServerRoute(["client"], ["agency_member"]);
  return <PrivateRuntime><Guard roles={["client"]} accountTypes={["agency_member"]}>{children}</Guard></PrivateRuntime>; }
