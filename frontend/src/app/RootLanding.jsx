'use client';
import HomePage from '../pages/HomePage';
import { useSession } from './session';
import { AppRedirect } from './navigation';
export default function RootLanding() {
  const { user, isPending } = useSession();
  // Public marketing content is safe to render before the browser session resolves.
  if (!user) return <HomePage />;
  if (['superadmin', 'staff'].includes(user.role)) return <AppRedirect to="/admin" replace />;
  if (isPending) return <AppRedirect to="/pending" replace />;
  return <AppRedirect to={user.account_type === 'end_user' ? '/u' : '/dashboard'} replace />;
}
